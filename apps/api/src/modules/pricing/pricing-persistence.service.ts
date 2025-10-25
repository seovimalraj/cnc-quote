import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { context, trace } from '@opentelemetry/api';
import { randomUUID } from 'crypto';
import { ContractsV1 } from '@cnc-quote/shared';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { PricingComplianceService, PricingComplianceEvent } from './pricing-compliance.service';
import {
  MANUAL_REVIEW_JOB_PRICING_COMPLIANCE,
  MANUAL_REVIEW_QUEUE,
  PricingComplianceGuardrailJob,
} from '../manual-review/manual-review.queue';
import { NotifyService } from '../notify/notify.service';
import { PricingComplianceMlAssistService } from './pricing-compliance-ml-assist.service';
import { PricingRationaleSummaryService } from './pricing-rationale-summary.service';

type PersistedComplianceEventRow = {
  id: string;
  code: string;
  severity: 'critical' | 'warning';
  trace_id: string;
};

type QuoteSnapshotRow = {
  id: string;
  org_id: string;
  status?: string | null;
  created_by?: string | null;
  user_id?: string | null;
};

@Injectable()
export class PricingPersistenceService {
  private readonly logger = new Logger(PricingPersistenceService.name);
  private readonly notifiedAlertKeys = new Set<string>();
  constructor(
    private readonly supabase: SupabaseService,
    private readonly pricingCompliance: PricingComplianceService,
    private readonly complianceMlAssist: PricingComplianceMlAssistService,
    private readonly rationaleSummary: PricingRationaleSummaryService,
    @InjectQueue(MANUAL_REVIEW_QUEUE)
    private readonly manualReviewQueue: Queue<PricingComplianceGuardrailJob>,
    @Optional()
    private readonly notifyService?: NotifyService,
  ) {}

  /**
   * Persist a new pricing matrix for a single quote item and recompute quote totals.
   * NOTE: Supabase JS client does not expose multi-statement transactions directly;
   * for now we do sequential ops with a risk window. Future: move to RPC or server function.
   */
  async persistMatrixAndTotals(params: {
    quote_id: string;
    quote_item_id: string;
    matrix: any[];
    partConfig?: ContractsV1.PartConfigV1;
    traceId?: string;
  }): Promise<{ subtotal: number; total: number; pricing_version: number }> {
    const { quote_id, quote_item_id, matrix, partConfig, traceId } = params;
  const pricing_version = Date.now();
  const pricingVersion = pricing_version;
    const resolvedTraceId = traceId ?? randomUUID();

    // 1. Update item matrix & version
    const { error: itemErr } = await this.supabase.client
      .from('quote_items')
      .update({ pricing_matrix: matrix, pricing_version, updated_at: new Date().toISOString() })
      .eq('id', quote_item_id);
    if (itemErr) throw itemErr;

    // 2. Fetch all item selected prices (simplified: first or matching selected_quantity if config exists)
    const { data: items, error: itemsErr } = await this.supabase.client
      .from('quote_items')
      .select('id, pricing_matrix, config_json')
      .eq('quote_id', quote_id);
    if (itemsErr) throw itemsErr;

    let subtotal = 0;
    for (const item of items || []) {
      const matrixVal: any[] = item.pricing_matrix || [];
      let selected = matrixVal[0];
      const selectedQty = item.config_json?.selected_quantity;
      if (selectedQty) {
        const match = matrixVal.find((m) => m.quantity === selectedQty);
        if (match) selected = match;
      }
      subtotal += selected?.total_price || 0;
    }

    // 3. Update quote with new subtotal/total (no tax/shipping yet)
    const { error: quoteErr } = await this.supabase.client
      .from('quotes')
      .update({ subtotal, total_amount: subtotal, updated_at: new Date().toISOString() })
      .eq('id', quote_id);
    if (quoteErr) throw quoteErr;

    try {
      const complianceEvents = this.pricingCompliance.evaluate({
        quoteId: quote_id,
        quoteItemId: quote_item_id,
        partId: partConfig?.id,
        matrix,
        traceId: resolvedTraceId,
      });

      this.annotateComplianceSpan(complianceEvents);

      if (complianceEvents.length > 0) {
        const persisted = await this.persistComplianceEvents(complianceEvents);
        const criticalEvents = complianceEvents.filter((event) => event.severity === 'critical');
        const criticalPersistedIds = persisted
          .filter((row) => row.severity === 'critical')
          .map((row) => row.id);

        if (criticalEvents.length > 0) {
          let shouldTriggerMlAssist = false;
          try {
            shouldTriggerMlAssist = await this.enqueueManualReviewEscalation({
              quoteId: quote_id,
              quoteItemId: quote_item_id,
              events: criticalEvents,
              persisted,
              partConfig,
              traceId: resolvedTraceId,
            });
          } catch (queueError) {
            const err = queueError as Error;
            this.logger.warn(
              `Failed to enqueue manual review escalation for quote_item=${quote_item_id}: ${err.message}`,
            );
          }

          if (criticalPersistedIds.length > 0 && shouldTriggerMlAssist) {
            this.complianceMlAssist
              .enqueueRationale({
                quoteId: quote_id,
                quoteItemId: quote_item_id,
                traceId: resolvedTraceId,
                eventIds: criticalPersistedIds,
              })
              .catch((error) => {
                this.logger.debug(
                  `Compliance ML assist enqueue failed for quote_item=${quote_item_id}: ${(error as Error).message}`,
                );
              });
          }
        }
      }
    } catch (error) {
      this.annotateComplianceSpan([]);
      this.logger.warn(
        `Failed to persist compliance events for quote_item=${quote_item_id}: ${(error as Error).message}`,
      );
    }

    try {
      await this.rationaleSummary.scheduleSummary({
        quoteId: quote_id,
        pricingVersion,
        subtotal,
        traceId: resolvedTraceId,
        items: (items ?? []).map((item) => ({
          id: item.id,
          pricing_matrix: item.pricing_matrix,
          config_json: item.config_json,
        })),
      });
    } catch (error) {
      this.logger.debug(
        `Failed to enqueue pricing rationale summary for quote=${quote_id}: ${(error as Error).message}`,
      );
    }

    return { subtotal, total: subtotal, pricing_version };
  }

  private async persistComplianceEvents(
    events: PricingComplianceEvent[],
  ): Promise<PersistedComplianceEventRow[]> {
    if (events.length === 0) {
      return [];
    }

    const payload = events.map((event) => ({
      quote_id: event.quoteId,
      quote_item_id: event.quoteItemId,
      part_id: event.partId ?? null,
      code: event.code,
      severity: event.severity,
      quantity: event.quantity,
      trace_id: event.traceId,
      payload: event.payload,
      message: event.message,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase.client
      .from('quote_compliance_events')
      .insert(payload)
      .select('id, code, severity, trace_id');

    if (error) {
      throw error;
    }

    return (data ?? []) as PersistedComplianceEventRow[];
  }

  private annotateComplianceSpan(events: PricingComplianceEvent[]): void {
    const span = trace.getSpan(context.active());
    if (!span) {
      return;
    }

    const total = events.length;
    const critical = events.filter((event) => event.severity === 'critical').length;
    const warning = total - critical;
    const codes = Array.from(new Set(events.map((event) => event.code)));

    span.setAttribute('pricing.compliance.event_count', total);
    span.setAttribute('pricing.compliance.critical_count', critical);
    span.setAttribute('pricing.compliance.warning_count', warning);
    if (codes.length > 0) {
      span.setAttribute('pricing.compliance.codes', codes);
    }
  }

  private async enqueueManualReviewEscalation(params: {
    quoteId: string;
    quoteItemId: string;
    events: PricingComplianceEvent[];
    persisted: PersistedComplianceEventRow[];
    partConfig?: ContractsV1.PartConfigV1;
    traceId: string;
  }): Promise<boolean> {
    const criticalRows = params.persisted.filter((row) => row.severity === 'critical');
    const criticalIds = criticalRows.map((row) => row.id);

    if (criticalIds.length === 0) {
      return false;
    }

    const unsentRows = criticalRows.filter((row) => {
      const key = this.buildAlertNotifyKey(params.quoteId, row.code);
      return !this.notifiedAlertKeys.has(key);
    });

    const hasNewCritical = unsentRows.length > 0;

    const quote = await this.fetchQuoteSnapshot(params.quoteId);
    if (!quote) {
      this.logger.warn(
        `Skipping manual review escalation for quote=${params.quoteId}; quote snapshot not found`,
      );
      return false;
    }

    const triggeredAt = new Date().toISOString();
    const jobPayload: PricingComplianceGuardrailJob = {
      version: 1,
      triggeredBy: 'pricing_compliance',
      quoteId: params.quoteId,
      quoteItemId: params.quoteItemId,
      orgId: quote.org_id,
      traceId: params.traceId,
      triggeredAt,
      eventIds: criticalIds,
      events: params.events.map((event) => ({
        code: event.code,
        message: event.message,
        quantity: event.quantity,
        partId: event.partId ?? null,
      })),
      quote: {
        status: quote.status ?? null,
        createdBy: quote.created_by ?? null,
        userId: quote.user_id ?? null,
      },
      part: {
        id: params.partConfig?.id ?? null,
      },
      traceparent: this.buildTraceparent(),
    };

    try {
      await this.manualReviewQueue.add(
        MANUAL_REVIEW_JOB_PRICING_COMPLIANCE,
        jobPayload,
        {
          jobId: `pricing-guardrail:${params.quoteItemId}:${criticalIds[criticalIds.length - 1]}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
      this.logger.debug(
        `Queued manual review escalation for quote=${params.quoteId} item=${params.quoteItemId} (events=${criticalIds.length})`,
      );

      if (unsentRows.length > 0) {
        await this.dispatchCriticalComplianceNotification({
          quoteSnapshot: quote,
          quoteId: params.quoteId,
          quoteItemId: params.quoteItemId,
          traceId: params.traceId,
          pendingRows: unsentRows,
          events: params.events,
          partConfig: params.partConfig,
          triggeredAt,
        });
      } else {
        this.logger.debug(
          `Critical compliance events already notified for quote=${params.quoteId} item=${params.quoteItemId}`,
        );
      }

      return hasNewCritical;
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('JobId') && err.message?.includes('already exists')) {
        this.logger.debug(
          `Manual review escalation job already enqueued for quote=${params.quoteId} item=${params.quoteItemId}`,
        );
        return false;
      }
      this.logger.error(
        `Failed to enqueue manual review escalation for quote=${params.quoteId}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  private async dispatchCriticalComplianceNotification(params: {
    quoteSnapshot: QuoteSnapshotRow;
    quoteId: string;
    quoteItemId: string;
    traceId: string;
    pendingRows: PersistedComplianceEventRow[];
    events: PricingComplianceEvent[];
    partConfig?: ContractsV1.PartConfigV1;
    triggeredAt: string;
  }): Promise<void> {
    if (!this.notifyService) {
      return;
    }

    if (params.pendingRows.length === 0) {
      return;
    }

    const criticalEvents = params.events.filter((evt) => evt.severity === 'critical');

    const payloadEvents = params.pendingRows.map((row) => {
      const matching =
        criticalEvents.find((evt) => evt.traceId === row.trace_id && evt.code === row.code)
        || criticalEvents.find((evt) => evt.code === row.code);
      return {
        id: row.id,
        code: row.code,
        message: matching?.message ?? 'Critical compliance alert triggered',
        quantity: matching?.quantity ?? 0,
        partId: matching?.partId ?? params.partConfig?.id ?? null,
      };
    });

    const dedupeKey = `quote:${params.quoteId}:codes:${payloadEvents
      .map((event) => event.code)
      .sort()
      .join('|')}`;

    try {
      await this.notifyService.notifyCriticalComplianceAlert({
        quoteId: params.quoteId,
        quoteItemId: params.quoteItemId,
        orgId: params.quoteSnapshot.org_id ?? null,
        traceId: params.traceId,
        eventIds: payloadEvents.map((evt) => evt.id),
        events: payloadEvents,
        quoteStatus: params.quoteSnapshot.status ?? null,
        partId: params.partConfig?.id ?? null,
        triggeredAt: params.triggeredAt,
        dedupeKey,
      });
      payloadEvents.forEach((evt) => {
        const key = this.buildAlertNotifyKey(params.quoteId, evt.code);
        this.notifiedAlertKeys.add(key);
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch compliance notification for quote=${params.quoteId} item=${params.quoteItemId}: ${(error as Error).message}`,
      );
    }
  }

  private buildAlertNotifyKey(quoteId: string, code: string): string {
    return `${quoteId}:${code}`;
  }

  private async fetchQuoteSnapshot(quoteId: string): Promise<QuoteSnapshotRow | null> {
    const { data, error } = await this.supabase.client
      .from('quotes')
      .select('id, org_id, status, created_by, user_id')
      .eq('id', quoteId)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Failed to fetch quote snapshot for guardrail escalation (quote=${quoteId}): ${error.message}`,
      );
      return null;
    }

    return (data as QuoteSnapshotRow) ?? null;
  }

  private buildTraceparent(): string | undefined {
    const span = trace.getSpan(context.active());
    if (!span) {
      return undefined;
    }

    const spanContext = span.spanContext();
    if (!spanContext?.traceId || !spanContext?.spanId) {
      return undefined;
    }

    const traceFlags = (spanContext.traceFlags ?? 1).toString(16).padStart(2, '0');
    return `00-${spanContext.traceId}-${spanContext.spanId}-${traceFlags}`;
  }
}
