import { SupabaseClient } from '@supabase/supabase-js';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../lib/logger.js';
import { ComplianceMetricSample, MetricsPublisher } from '../lib/pushgateway.js';

export interface ComplianceAnalyticsResult {
  bucketDate: string;
  windowStart: string;
  windowEnd: string;
  eventCount: number;
  quoteCount: number;
  insertedRows: number;
}

export interface ComplianceAnalyticsOptions {
  /** Optional override for the bucket to evaluate (UTC date string or ISO timestamp). */
  bucketDate?: Date;
  /** Optional override for window length, default 24h. */
  windowHours?: number;
}

type ComplianceEventRow = {
  id: string;
  code: string;
  severity: 'critical' | 'warning' | string;
  org_id: string | null;
  quote_id: string | null;
  quote_item_id: string | null;
  message: string | null;
  created_at: string;
  payload: any;
};

type QuoteRollupAccumulator = {
  code: string;
  severity: string;
  orgId: string | null;
  quoteId: string | null;
  eventCount: number;
  quoteItemIds: Set<string>;
  messages: Set<string>;
  maxDiscountPercent: number | null;
  maxLeadOverrideDays: number | null;
};

type SummaryAccumulator = {
  code: string;
  severity: string;
  orgId: string | null;
  eventCount: number;
  quoteCount: number;
  topOffenders: Array<{
    quote_id: string | null;
    event_count: number;
    metric: number;
    metric_label: string;
    quote_item_ids: string[];
  }>;
};

const HOURS_TO_MS = 60 * 60 * 1000;
const PAGE_SIZE = 1000;

/**
 * @module Worker/ComplianceAnalytics
 * @ownership pricing
 * Nightly aggregation pipeline that snapshots compliance guardrail activity into deterministic
 * rollup rows and companion metrics for Prometheus alerting. Runs inside the worker domain so the
 * analytics load never blocks interactive pricing requests.
 */
export class ComplianceAnalyticsService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly metricsPublisher: MetricsPublisher,
  ) {}

  async run(options: ComplianceAnalyticsOptions = {}): Promise<ComplianceAnalyticsResult> {
    const tracer = trace.getTracer('worker');
    return tracer.startActiveSpan('worker.compliance.analytics.run', async (span) => {
      try {
        const reference = options.bucketDate ? new Date(options.bucketDate) : new Date();
        const windowHours = options.windowHours ?? 24;
        const windowEnd = new Date(Date.UTC(
          reference.getUTCFullYear(),
          reference.getUTCMonth(),
          reference.getUTCDate(),
          0,
          0,
          0,
          0,
        ));
        const windowStart = new Date(windowEnd.getTime() - windowHours * HOURS_TO_MS);
        const bucketDate = new Date(windowStart);
        bucketDate.setUTCHours(0, 0, 0, 0);

        const windowStartIso = windowStart.toISOString();
        const windowEndIso = windowEnd.toISOString();
        const bucketDateIso = bucketDate.toISOString().slice(0, 10);

        span.setAttribute('analytics.window.start', windowStartIso);
        span.setAttribute('analytics.window.end', windowEndIso);
        span.setAttribute('analytics.bucket', bucketDateIso);

        const events = await this.fetchComplianceEvents(windowStartIso, windowEndIso);
        logger.info({ count: events.length, bucketDate: bucketDateIso }, 'Fetched compliance events for rollup');

        const { quoteRows, summaryRows, totalEvents, totalQuotes } = this.buildRollups(events, bucketDateIso);

        // Remove any existing rollups for this bucket before inserting fresh data.
        await this.deleteExistingRollups(bucketDateIso);

        const rowsToInsert = [...quoteRows, ...summaryRows];
        if (rowsToInsert.length > 0) {
          await this.insertRollups(rowsToInsert);
        }

        await this.publishMetrics(summaryRows);

        span.setAttribute('analytics.event.count', totalEvents);
        span.setAttribute('analytics.quote.count', totalQuotes);
        span.setAttribute('analytics.rows.inserted', rowsToInsert.length);
        span.setStatus({ code: SpanStatusCode.OK });

        return {
          bucketDate: bucketDateIso,
          windowStart: windowStartIso,
          windowEnd: windowEndIso,
          eventCount: totalEvents,
          quoteCount: totalQuotes,
          insertedRows: rowsToInsert.length,
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async fetchComplianceEvents(windowStartIso: string, windowEndIso: string): Promise<ComplianceEventRow[]> {
    const results: ComplianceEventRow[] = [];
    let page = 0;

    while (true) {
      const { data, error } = await this.supabase
        .from('quote_compliance_events')
        .select('id, code, severity, org_id, quote_id, quote_item_id, message, created_at, payload')
        .gte('created_at', windowStartIso)
        .lt('created_at', windowEndIso)
        .order('created_at', { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Failed to fetch compliance events: ${error.message}`);
      }

      const pageData = (data ?? []) as ComplianceEventRow[];
      results.push(...pageData);

      if (pageData.length < PAGE_SIZE) {
        break;
      }

      page += 1;
    }

    return results;
  }

  private buildRollups(events: ComplianceEventRow[], bucketDateIso: string) {
    const groups = new Map<string, QuoteRollupAccumulator>();
    const summaries = new Map<string, SummaryAccumulator>();

    for (const event of events) {
      const key = `${event.code}|${event.severity}|${event.org_id ?? 'null'}|${event.quote_id ?? 'null'}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          code: event.code,
          severity: event.severity,
          orgId: event.org_id ?? null,
          quoteId: event.quote_id ?? null,
          eventCount: 0,
          quoteItemIds: new Set<string>(),
          messages: new Set<string>(),
          maxDiscountPercent: null,
          maxLeadOverrideDays: null,
        };
        groups.set(key, group);
      }

      group.eventCount += 1;
      if (event.quote_item_id) {
        group.quoteItemIds.add(event.quote_item_id);
      }
      if (event.message) {
        group.messages.add(event.message);
      }

      const snapshot = event.payload?.snapshot;
      if (snapshot) {
        if (typeof snapshot.discount_percent === 'number') {
          group.maxDiscountPercent = Math.max(
            group.maxDiscountPercent ?? 0,
            snapshot.discount_percent,
          );
        }
        if (typeof snapshot.lead_time_override_days === 'number') {
          group.maxLeadOverrideDays = Math.max(
            group.maxLeadOverrideDays ?? 0,
            snapshot.lead_time_override_days,
          );
        }
      }

      const summaryKey = `${event.code}|${event.severity}|${event.org_id ?? 'null'}`;
      let summary = summaries.get(summaryKey);
      if (!summary) {
        summary = {
          code: event.code,
          severity: event.severity,
          orgId: event.org_id ?? null,
          eventCount: 0,
          quoteCount: 0,
          topOffenders: [],
        };
        summaries.set(summaryKey, summary);
      }
      summary.eventCount += 1;
    }

    const quoteRows = Array.from(groups.values()).map((group) => ({
      bucket_date: bucketDateIso,
      code: group.code,
      severity: group.severity,
      org_id: group.orgId,
      quote_id: group.quoteId,
      event_count: group.eventCount,
      quote_count: 1,
      metadata: {
        quote_item_ids: Array.from(group.quoteItemIds).slice(0, 10),
        sample_messages: Array.from(group.messages).slice(0, 5),
        max_discount_percent: group.maxDiscountPercent,
        max_lead_override_days: group.maxLeadOverrideDays,
      },
    }));

    // Populate summary aggregates, leveraging the grouped rows for offender computation.
    const summaryRows = Array.from(summaries.values()).map((summary) => {
      const matchingRows = quoteRows.filter(
        (row) => row.code === summary.code && row.severity === summary.severity && row.org_id === summary.orgId,
      );

      summary.quoteCount = matchingRows.length;

      const offenders = matchingRows
        .map((row) => ({
          quote_id: row.quote_id,
          event_count: row.event_count,
          metric: this.computeOffenderMetric(row),
          metric_label: this.metricLabelForCode(row.code),
          quote_item_ids: row.metadata.quote_item_ids,
        }))
        .sort((a, b) => b.metric - a.metric)
        .slice(0, 10);

      return {
        bucket_date: bucketDateIso,
        code: summary.code,
        severity: summary.severity,
        org_id: summary.orgId,
        quote_id: null,
        event_count: summary.eventCount,
        quote_count: summary.quoteCount,
        metadata: {
          top_offenders: offenders,
        },
      };
    });

    const totalEvents = events.length;
    const totalQuotes = quoteRows.length;

    return { quoteRows, summaryRows, totalEvents, totalQuotes };
  }

  private metricLabelForCode(code: string): string {
    switch (code) {
      case 'quote_manual_discount_high':
        return 'max_discount_percent';
      case 'lead_time_override_detected':
        return 'max_lead_override_days';
      default:
        return 'event_count';
    }
  }

  private computeOffenderMetric(row: {
    code: string;
    event_count: number;
    metadata: {
      max_discount_percent: number | null;
      max_lead_override_days: number | null;
    };
  }): number {
    if (row.code === 'quote_manual_discount_high') {
      return row.metadata.max_discount_percent ?? 0;
    }
    if (row.code === 'lead_time_override_detected') {
      return row.metadata.max_lead_override_days ?? 0;
    }
    return row.event_count;
  }

  private async deleteExistingRollups(bucketDateIso: string): Promise<void> {
    const { error } = await this.supabase
      .from('quote_compliance_daily_rollups')
      .delete()
      .eq('bucket_date', bucketDateIso);

    if (error) {
      throw new Error(`Failed to purge existing rollups for ${bucketDateIso}: ${error.message}`);
    }
  }

  private async insertRollups(rows: Array<Record<string, any>>): Promise<void> {
    const { error } = await this.supabase
      .from('quote_compliance_daily_rollups')
      .insert(rows);

    if (error) {
      throw new Error(`Failed to insert compliance rollups: ${error.message}`);
    }
  }

  private async publishMetrics(summaryRows: Array<Record<string, any>>): Promise<void> {
    if (summaryRows.length === 0) {
      await this.metricsPublisher.publishCompliance([]);
      return;
    }

    const samples: ComplianceMetricSample[] = summaryRows.map((row) => ({
      code: row.code,
      severity: row.severity,
      orgId: row.org_id ?? null,
      eventCount: row.event_count,
      quoteCount: row.quote_count,
    }));

    await this.metricsPublisher.publishCompliance(samples);
  }
}
