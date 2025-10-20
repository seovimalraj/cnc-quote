import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractsV1 } from '@cnc-quote/shared';

type ComplianceMatrixRow = {
  quantity?: number;
  compliance?: ContractsV1.QuoteComplianceSnapshotV1;
  cost_factors?: Record<string, number>;
};

/**
 * @module PricingComplianceService
 * @ownership pricing
 * Evaluates pricing compliance snapshots emitted by the pricing engine and normalizes them into
 * auditable quote compliance events. Mirrors the admin risk heuristics but operates on the
 * deterministic QuoteComplianceSnapshotV1 payload generated at pricing time.
 */
@Injectable()
export class PricingComplianceService {
  private static readonly MANUAL_DISCOUNT_FALLBACK = 0.22;
  private static readonly RISK_UPLIFT_EPSILON = 0.0001;

  private readonly logger = new Logger(PricingComplianceService.name);
  private readonly manualDiscountThreshold: number;

  constructor(private readonly config: ConfigService) {
    this.manualDiscountThreshold = this.resolveNumericThreshold(
      'PRICING_DISCOUNT_ALERT_THRESHOLD',
      PricingComplianceService.MANUAL_DISCOUNT_FALLBACK,
    );
  }

  evaluate(params: {
    quoteId: string;
    quoteItemId: string;
    partId?: string;
  matrix: ComplianceMatrixRow[];
    traceId: string;
  }): PricingComplianceEvent[] {
    const { quoteId, quoteItemId, partId, matrix, traceId } = params;

    const events: PricingComplianceEvent[] = [];
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return events;
    }

    for (const row of matrix) {
      const snapshot = row?.compliance;
      if (!snapshot) {
        continue;
      }

      const { quantity } = snapshot;

      if (this.isMarginFloorBreach(snapshot)) {
        events.push({
          quoteId,
          quoteItemId,
          partId,
          quantity,
          code: 'quote_margin_floor_breach',
          severity: 'critical',
          message: this.formatMarginMessage(snapshot),
          traceId,
          payload: this.buildPayload(traceId, snapshot, row),
        });
      }

      if (this.isManualDiscountHigh(snapshot)) {
        events.push({
          quoteId,
          quoteItemId,
          partId,
          quantity,
          code: 'quote_manual_discount_high',
          severity: 'warning',
          message: this.formatDiscountMessage(snapshot),
          traceId,
          payload: this.buildPayload(traceId, snapshot, row),
        });
      }

      if (this.isLeadTimeOverride(snapshot)) {
        events.push({
          quoteId,
          quoteItemId,
          partId,
          quantity,
          code: 'lead_time_override_detected',
          severity: 'critical',
          message: this.formatLeadTimeOverrideMessage(snapshot),
          traceId,
          payload: this.buildPayload(traceId, snapshot, row),
        });
      }

      if (this.isDfmHighRiskIgnored(snapshot)) {
        events.push({
          quoteId,
          quoteItemId,
          partId,
          quantity,
          code: 'dfm_high_risk_ignored',
          severity: 'warning',
          message: this.formatDfmMessage(snapshot),
          traceId,
          payload: this.buildPayload(traceId, snapshot, row),
        });
      }
    }

    return events;
  }

  private resolveNumericThreshold(key: string, fallback: number): number {
    const raw = this.config.get<string | number>(key);
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  private isMarginFloorBreach(snapshot: ContractsV1.QuoteComplianceSnapshotV1): boolean {
    const floor = snapshot.margin_floor_percent;
    if (floor == null) return false;
    const margin = snapshot.margin_percent ?? 0;
    return margin + 1e-6 < floor;
  }

  private isManualDiscountHigh(snapshot: ContractsV1.QuoteComplianceSnapshotV1): boolean {
    const discount = snapshot.discount_percent;
    if (discount == null) {
      return false;
    }
    return discount >= this.manualDiscountThreshold;
  }

  private isLeadTimeOverride(snapshot: ContractsV1.QuoteComplianceSnapshotV1): boolean {
    return typeof snapshot.lead_time_override_days === 'number';
  }

  private isDfmHighRiskIgnored(snapshot: ContractsV1.QuoteComplianceSnapshotV1): boolean {
    const severity = snapshot.dfm_risk_severity;
    if (!severity || (severity !== 'HIGH' && severity !== 'CRITICAL')) {
      return false;
    }
    const uplift = snapshot.risk_uplift_percent ?? 0;
    return uplift < PricingComplianceService.RISK_UPLIFT_EPSILON;
  }

  private formatMarginMessage(snapshot: ContractsV1.QuoteComplianceSnapshotV1): string {
    const margin = (snapshot.margin_percent * 100).toFixed(2);
    const floor = ((snapshot.margin_floor_percent ?? 0) * 100).toFixed(2);
    return `Margin ${margin}% below guardrail ${floor}%`;
  }

  private formatDiscountMessage(snapshot: ContractsV1.QuoteComplianceSnapshotV1): string {
    const discount = ((snapshot.discount_percent ?? 0) * 100).toFixed(2);
    const threshold = (this.manualDiscountThreshold * 100).toFixed(2);
    return `Quantity discount ${discount}% exceeds guardrail ${threshold}%`;
  }

  private formatLeadTimeOverrideMessage(snapshot: ContractsV1.QuoteComplianceSnapshotV1): string {
    const days = snapshot.lead_time_override_days ?? 0;
    return `Manual lead-time override detected (${days} days)`;
  }

  private formatDfmMessage(snapshot: ContractsV1.QuoteComplianceSnapshotV1): string {
    const severity = snapshot.dfm_risk_severity ?? 'HIGH';
    return `DFM risk ${severity} without pricing uplift`;
  }

  private buildPayload(
    traceId: string,
    snapshot: ContractsV1.QuoteComplianceSnapshotV1,
    row: ComplianceMatrixRow,
  ): PricingCompliancePayload {
    return {
      trace_id: traceId,
      snapshot,
      breakdown_costs: row.cost_factors,
      alerts: snapshot.alerts,
    };
  }
}

export type PricingComplianceEventCode =
  | 'quote_margin_floor_breach'
  | 'quote_manual_discount_high'
  | 'lead_time_override_detected'
  | 'dfm_high_risk_ignored';

export interface PricingComplianceEvent {
  quoteId: string;
  quoteItemId: string;
  partId?: string;
  quantity: number;
  code: PricingComplianceEventCode;
  severity: 'critical' | 'warning';
  message: string;
  traceId: string;
  payload: PricingCompliancePayload;
}

export interface PricingCompliancePayload {
  trace_id: string;
  snapshot: ContractsV1.QuoteComplianceSnapshotV1;
  breakdown_costs?: Record<string, number>;
  alerts?: ContractsV1.QuoteComplianceAlertV1[];
}
