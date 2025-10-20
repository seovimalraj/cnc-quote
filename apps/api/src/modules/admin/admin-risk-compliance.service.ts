import { Injectable, Logger } from '@nestjs/common';
import { ContractsV1 } from '@cnc-quote/shared';

type EvaluationContext = {
  area?: string | null;
  action?: string | null;
  notes?: string | null;
  target_type?: string | null;
  target_id?: string | null;
};

type PrimitiveChange = {
  path: string;
  before: unknown;
  after: unknown;
  kind: 'number' | 'string' | 'boolean' | 'other';
  delta?: number;
  percent?: number | null;
};

/**
 * @module AdminRiskComplianceService
 * @ownership platform-admin
 * Evaluates admin activity diffs to surface pricing and lead-time anomalies that warrant manual review.
 */
@Injectable()
export class AdminRiskComplianceService {
  private static readonly MAX_DEPTH = 6;
  private static readonly MAX_CHANGES = 96;
  private static readonly PRICING_KEYWORDS = ['pricing', 'margin', 'multiplier', 'surcharge', 'markup', 'cost'];
  private static readonly LEAD_TIME_KEYWORDS = ['lead', 'ship', 'schedule', 'expedite'];

  private readonly logger = new Logger(AdminRiskComplianceService.name);

  /**
   * Inspects a normalized before/after snapshot and emits compliance alerts when heuristics detect risky edits.
   */
  evaluate(
    context: EvaluationContext,
    diff: ContractsV1.AdminRecentEventDiffV1 | null,
  ): ContractsV1.AdminRecentEventAlertV1[] {
    if (!diff) {
      return [];
    }

    const beforeSnapshot = diff.before ?? null;
    const afterSnapshot = diff.after ?? null;

    const changes = this.collectPrimitiveChanges(beforeSnapshot, afterSnapshot);
    if (!changes.length) {
      return [];
    }

    const alerts: ContractsV1.AdminRecentEventAlertV1[] = [];

    if (this.shouldAnalyzePricing(context)) {
      const pricingAlert = this.detectPricingDelta(changes);
      if (pricingAlert) {
        alerts.push(pricingAlert);
      }
    }

    if (this.shouldAnalyzeLeadTime(context)) {
      const leadTimeAlert = this.detectLeadTimeOverride(changes);
      if (leadTimeAlert) {
        alerts.push(leadTimeAlert);
      }
    }

    return alerts;
  }

  private shouldAnalyzePricing(context: EvaluationContext): boolean {
    const haystack = [context.area, context.action, context.target_type]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase();

    return AdminRiskComplianceService.PRICING_KEYWORDS.some((keyword) => haystack.includes(keyword));
  }

  private shouldAnalyzeLeadTime(context: EvaluationContext): boolean {
    const haystack = [context.area, context.action, context.notes]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase();

    if (AdminRiskComplianceService.LEAD_TIME_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
      return true;
    }

    return Boolean(context.target_type && context.target_type.toLowerCase().includes('lead'));
  }

  private detectPricingDelta(changes: PrimitiveChange[]): ContractsV1.AdminRecentEventAlertV1 | null {
    const numericChanges = changes.filter((change) => change.kind === 'number');
    if (!numericChanges.length) {
      return null;
    }

    const significant = numericChanges.filter((change) => this.isSignificantPricingChange(change));
    if (!significant.length) {
      return null;
    }

    const topChange = significant.reduce((prev, current) => {
      const prevMagnitude = this.changeMagnitude(prev);
      const currentMagnitude = this.changeMagnitude(current);
      return currentMagnitude > prevMagnitude ? current : prev;
    });

    const severity = this.resolvePricingSeverity(topChange);
    const percentLabel = this.formatPercent(topChange.percent);
    const deltaLabel = typeof topChange.delta === 'number' ? topChange.delta.toFixed(2) : 'n/a';

    return {
      code: 'pricing_delta',
      severity,
      message: `Pricing config change on ${topChange.path || 'root'} (${percentLabel} / Δ ${deltaLabel}).`,
      metadata: {
        path: topChange.path || 'root',
        before: topChange.before,
        after: topChange.after,
        delta: topChange.delta ?? null,
        percent_delta: topChange.percent ?? null,
        sampled_changes: significant.slice(0, 5),
      },
    } satisfies ContractsV1.AdminRecentEventAlertV1;
  }

  private detectLeadTimeOverride(changes: PrimitiveChange[]): ContractsV1.AdminRecentEventAlertV1 | null {
    const leadTimeChanges = changes.filter((change) => this.isLeadTimeChange(change));
    if (!leadTimeChanges.length) {
      return null;
    }

    const numericLeadTime = leadTimeChanges.find((change) => change.kind === 'number');
    const stringLeadTime = leadTimeChanges.find((change) => change.kind === 'string');

    if (numericLeadTime) {
      const delta = typeof numericLeadTime.delta === 'number' ? numericLeadTime.delta : 0;
      if (Math.abs(delta) < 1) {
        return null;
      }

      const severity: ContractsV1.AdminRecentEventAlertSeverityV1 = delta <= -5 ? 'critical' : 'warning';
      const direction = delta < 0 ? 'decreased' : 'increased';

      return {
        code: 'lead_time_override',
        severity,
        message: `Lead time ${direction} by ${Math.abs(delta).toFixed(1)} days on ${numericLeadTime.path || 'target'}.`,
        metadata: {
          path: numericLeadTime.path || 'root',
          before: numericLeadTime.before,
          after: numericLeadTime.after,
          delta,
        },
      } satisfies ContractsV1.AdminRecentEventAlertV1;
    }

    if (stringLeadTime && this.isExpediteString(stringLeadTime.after)) {
      return {
        code: 'lead_time_override',
        severity: 'critical',
        message: `Lead time option overridden to ${String(stringLeadTime.after)} on ${stringLeadTime.path || 'target'}.`,
        metadata: {
          path: stringLeadTime.path || 'root',
          before: stringLeadTime.before,
          after: stringLeadTime.after,
        },
      } satisfies ContractsV1.AdminRecentEventAlertV1;
    }

    return null;
  }

  private collectPrimitiveChanges(before: unknown, after: unknown): PrimitiveChange[] {
    const results: PrimitiveChange[] = [];

    try {
      this.walkDiff(before, after, [], results, 0);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to compute diff for risk evaluation: ${detail}`);
      return [];
    }

    return results.slice(0, AdminRiskComplianceService.MAX_CHANGES);
  }

  private walkDiff(
    before: unknown,
    after: unknown,
    path: string[],
    results: PrimitiveChange[],
    depth: number,
  ): void {
    if (depth > AdminRiskComplianceService.MAX_DEPTH || results.length >= AdminRiskComplianceService.MAX_CHANGES) {
      return;
    }

    if (this.equals(before, after)) {
      return;
    }

    if (typeof before === 'number' && typeof after === 'number') {
      const delta = after - before;
      const percent = this.computePercentDelta(before, after);
      results.push({
        path: path.join('.'),
        before,
        after,
        kind: 'number',
        delta,
        percent,
      });
      return;
    }

    if (typeof before === 'string' && typeof after === 'string') {
      results.push({
        path: path.join('.'),
        before,
        after,
        kind: 'string',
      });
      return;
    }

    if (typeof before === 'boolean' && typeof after === 'boolean') {
      results.push({
        path: path.join('.'),
        before,
        after,
        kind: 'boolean',
      });
      return;
    }

    if (Array.isArray(before) && Array.isArray(after)) {
      const maxLength = Math.max(before.length, after.length);
      for (let index = 0; index < maxLength; index += 1) {
        this.walkDiff(before[index], after[index], [...path, String(index)], results, depth + 1);
        if (results.length >= AdminRiskComplianceService.MAX_CHANGES) {
          break;
        }
      }
      return;
    }

    if (this.isPlainObject(before) && this.isPlainObject(after)) {
      const keys = new Set<string>([
        ...Object.keys(before as Record<string, unknown>),
        ...Object.keys(after as Record<string, unknown>),
      ]);

      for (const key of keys) {
        this.walkDiff(
          (before as Record<string, unknown>)[key],
          (after as Record<string, unknown>)[key],
          [...path, key],
          results,
          depth + 1,
        );
        if (results.length >= AdminRiskComplianceService.MAX_CHANGES) {
          break;
        }
      }
      return;
    }

    results.push({
      path: path.join('.'),
      before,
      after,
      kind: 'other',
    });
  }

  private equals(left: unknown, right: unknown): boolean {
    if (left === right) {
      return true;
    }

    if (left && right && typeof left === 'object' && typeof right === 'object') {
      try {
        return JSON.stringify(left) === JSON.stringify(right);
      } catch {
        return false;
      }
    }

    return false;
  }

  private computePercentDelta(before: number, after: number): number | null {
    if (before === 0) {
      return null;
    }

    return (after - before) / Math.abs(before);
  }

  private changeMagnitude(change: PrimitiveChange): number {
    if (typeof change.delta === 'number') {
      return Math.abs(change.delta);
    }

    if (typeof change.percent === 'number') {
      return Math.abs(change.percent);
    }

    return 0;
  }

  private resolvePricingSeverity(change: PrimitiveChange): ContractsV1.AdminRecentEventAlertSeverityV1 {
    const percent = typeof change.percent === 'number' ? Math.abs(change.percent) : 0;
    const delta = typeof change.delta === 'number' ? Math.abs(change.delta) : 0;
    const path = change.path.toLowerCase();

    if (percent >= 0.5 || delta >= 2000 || path.includes('margin') && percent >= 0.15) {
      return 'critical';
    }

    return 'warning';
  }

  private isSignificantPricingChange(change: PrimitiveChange): boolean {
    if (change.kind !== 'number') {
      return false;
    }

    const path = change.path.toLowerCase();
    const percent = typeof change.percent === 'number' ? Math.abs(change.percent) : null;
    const delta = typeof change.delta === 'number' ? Math.abs(change.delta) : null;

    const isMarginPath = path.includes('margin') || path.includes('markup');
  const isMultiplierPath = path.includes('multiplier') || path.includes('mult');
    const isCostPath = path.includes('cost') || path.includes('price');

    const percentThreshold = isMarginPath ? 0.1 : 0.25;
    const absoluteThreshold = isCostPath ? 250 : 500;

    if (percent !== null && percent >= percentThreshold) {
      return true;
    }

    if (delta !== null && delta >= absoluteThreshold) {
      return true;
    }

    if (isMultiplierPath && delta !== null && delta >= 0.1) {
      return true;
    }

    return false;
  }

  private isLeadTimeChange(change: PrimitiveChange): boolean {
    const path = change.path.toLowerCase();

    if (path.includes('lead_time') || path.includes('leadtime') || path.includes('promised_lead')) {
      return true;
    }

    if (path.includes('ship_date') || path.includes('delivery') || path.includes('due_at')) {
      return true;
    }

    if (change.kind === 'string' && this.isExpediteString(change.after)) {
      return true;
    }

    return false;
  }

  private isExpediteString(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const normalized = value.toLowerCase();
    return normalized.includes('expedite') || normalized.includes('rush') || normalized.includes('override');
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private formatPercent(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return 'n/a';
    }

    const percentage = value * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  }
}