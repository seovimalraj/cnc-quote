import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { OllamaService } from "../ai/ollama.service";
import { ContractsV1 } from '@cnc-quote/shared';
import { PRICING_COMPLIANCE_ML_JOB, PRICING_COMPLIANCE_ML_QUEUE, PricingComplianceMlAssistJob } from './pricing-ml-assist.queue';

interface InsertPayload {
  quote_id: string;
  quote_item_id: string;
  org_id: string | null;
  trace_id: string;
  feature_flag_key: string;
  model: string;
  version: number;
  rationale_text: string;
  remediation_actions: string[];
  alerts: ContractsV1.QuoteComplianceAlertV1[];
  quote_snapshot: ContractsV1.QuoteComplianceSnapshotV1 | null;
  events: Array<{ code: string; severity: string; message: string }>;
  raw_response: string;
  job_metadata: Record<string, unknown>;
}

@Injectable()
@Processor(PRICING_COMPLIANCE_ML_QUEUE)
export class PricingComplianceMlAssistProcessor extends WorkerHost {
  private readonly logger = new Logger(PricingComplianceMlAssistProcessor.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ollama: OllamaService,
  ) {
    super();
  }

  async process(job: Job<PricingComplianceMlAssistJob>): Promise<void> {
    if (job.name !== PRICING_COMPLIANCE_ML_JOB) {
      throw new Error(`Unknown job type: ${job.name}`);
    }
    
    return this.handle(job);
  }

  private async handle(job: Job<PricingComplianceMlAssistJob>): Promise<void> {
    const tracer = trace.getTracer('api');
    await tracer.startActiveSpan('pricing.compliance.ml_assist', async (span) => {
      try {
        span.setAttribute('quote.id', job.data.quoteId);
        span.setAttribute('quote.item_id', job.data.quoteItemId);
        span.setAttribute('ml.feature_flag', job.data.featureFlagKey);

        const events = await this.fetchComplianceEvents(job.data.eventIds);
        if (events.length === 0) {
          this.logger.warn(
            `No compliance events found for ML job (quote=${job.data.quoteId}, events=${job.data.eventIds.join(',')})`,
          );
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'No events found' });
          return;
        }

        const quote = await this.fetchQuote(job.data.quoteId);
        const alerts = this.collectAlerts(events);
        const snapshot = this.selectSnapshot(events);

        const prompt = this.buildPrompt({ quote, alerts, events, snapshot });
        const response = await this.ollama.chat(
          [
            {
              role: 'system',
              content:
                'You are a senior CNC pricing reviewer. Summarize guardrail breaches and propose remediation. Respond using strict JSON with keys "rationale" and "remediation" (array of strings). Never suggest changing price directly.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          {
            model: 'llama3.1:8b',
            temperature: 0.2,
          },
        );

        const parsed = this.parseResponse(response.message.content);

        const insertPayload: InsertPayload = {
          quote_id: job.data.quoteId,
          quote_item_id: job.data.quoteItemId,
          org_id: job.data.orgId ?? null,
          trace_id: job.data.traceId,
          feature_flag_key: job.data.featureFlagKey,
          model: response.model,
          version: 1,
          rationale_text: parsed.rationale,
          remediation_actions: parsed.remediation,
          alerts,
          quote_snapshot: snapshot,
          events: events.map((evt) => ({
            code: evt.code,
            severity: evt.severity,
            message: evt.message ?? '',
          })),
          raw_response: response.message.content,
          job_metadata: {
            triggered_at: job.data.triggeredAt,
            event_ids: job.data.eventIds,
          },
        };

        await this.persistInsight(insertPayload);
        span.setStatus({ code: SpanStatusCode.OK });
        this.logger.debug(
          `Stored compliance ML insight for quote=${job.data.quoteId} item=${job.data.quoteItemId}`,
        );
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        this.logger.error(
          `Compliance ML job failed for quote=${job.data.quoteId} item=${job.data.quoteItemId}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async fetchComplianceEvents(eventIds: string[]) {
    const { data, error } = await this.supabase.client
      .from('quote_compliance_events')
      .select('id, code, severity, message, payload')
      .in('id', eventIds);

    if (error) {
      throw new Error(`Failed to load compliance events: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      code: String(row.code),
      severity: String(row.severity),
      message: row.message as string | null,
      payload: row.payload as { snapshot?: ContractsV1.QuoteComplianceSnapshotV1 } | null,
    }));
  }

  private async fetchQuote(quoteId: string) {
    const { data, error } = await this.supabase.client
      .from('quotes')
      .select('id, number, status, subtotal, total_amount, currency, org_id, created_at, updated_at')
      .eq('id', quoteId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load quote context: ${error.message}`);
    }

    return data ?? null;
  }

  private collectAlerts(
    events: Array<{
      payload: { snapshot?: ContractsV1.QuoteComplianceSnapshotV1 } | null;
      code: string;
      severity: string;
      message: string | null;
    }>,
  ): ContractsV1.QuoteComplianceAlertV1[] {
    const alerts: ContractsV1.QuoteComplianceAlertV1[] = [];
    for (const event of events) {
      const snapshotAlerts = event.payload?.snapshot?.alerts ?? [];
      if (snapshotAlerts.length > 0) {
        alerts.push(...snapshotAlerts);
      } else if (event.message) {
        alerts.push({
          code: event.code as ContractsV1.QuoteComplianceAlertCodeV1,
          severity: (event.severity as ContractsV1.QuoteComplianceAlertSeverityV1) ?? 'warning',
          message: event.message,
        });
      }
    }

    const seen = new Set<string>();
    return alerts.filter((alert) => {
      const key = `${alert.code}:${alert.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private selectSnapshot(
    events: Array<{
      payload: { snapshot?: ContractsV1.QuoteComplianceSnapshotV1 } | null;
    }>,
  ): ContractsV1.QuoteComplianceSnapshotV1 | null {
    for (const event of events) {
      if (event.payload?.snapshot) {
        return event.payload.snapshot;
      }
    }
    return null;
  }

  private buildPrompt(params: {
    quote: Record<string, any> | null;
    alerts: ContractsV1.QuoteComplianceAlertV1[];
    events: Array<{ code: string; severity: string; message: string | null }>;
    snapshot: ContractsV1.QuoteComplianceSnapshotV1 | null;
  }): string {
    const quoteSummary = params.quote
      ? `Quote ${params.quote.number ?? params.quote.id} (${params.quote.status ?? 'unknown'}) total ${params.quote.total_amount ?? 'n/a'} ${params.quote.currency ?? ''}`
      : 'Quote context unavailable';

    const snapshotSummary = params.snapshot
      ? `Selected matrix row: qty ${params.snapshot.quantity}, total ${params.snapshot.total_price} ${params.snapshot.currency}, margin ${Math.round((params.snapshot.margin_percent ?? 0) * 100)}%.`
      : 'Snapshot unavailable.';

    const alertSummary = params.alerts
      .map((alert) => `- [${alert.severity.toUpperCase()}] ${alert.code}: ${alert.message}`)
      .join('\n');

    const eventSummary = params.events
      .map((event) => `- ${event.code} (${event.severity}): ${event.message ?? 'no message provided'}`)
      .join('\n');

    return [
      quoteSummary,
      snapshotSummary,
      'Triggered events:',
      eventSummary || '- none listed',
      'Unique alerts:',
      alertSummary || '- none provided',
      'Provide a concise reviewer rationale and 2-4 remediation ideas. Never modify pricing values; focus on process or documentation steps.',
    ].join('\n');
  }

  private parseResponse(content: string): { rationale: string; remediation: string[] } {
    try {
      const parsed = JSON.parse(content);
      const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : content;
      const remediation = Array.isArray(parsed.remediation)
        ? parsed.remediation.filter((item) => typeof item === 'string')
        : [];
      return { rationale, remediation };
    } catch (error) {
      this.logger.warn('Failed to parse ML response as JSON; storing raw content');
      return { rationale: content, remediation: [] };
    }
  }

  private async persistInsight(payload: InsertPayload): Promise<void> {
    const { error } = await this.supabase.client
      .from('quote_compliance_ml_insights')
      .insert({
        quote_id: payload.quote_id,
        quote_item_id: payload.quote_item_id,
        org_id: payload.org_id,
        trace_id: payload.trace_id,
        feature_flag_key: payload.feature_flag_key,
        model: payload.model,
        version: payload.version,
        rationale_text: payload.rationale_text,
        remediation_actions: payload.remediation_actions,
        alerts: payload.alerts,
        quote_snapshot: payload.quote_snapshot,
        events: payload.events,
        raw_response: payload.raw_response,
        job_metadata: payload.job_metadata,
      });

    if (error) {
      throw new Error(`Failed to upsert ML insight: ${error.message}`);
    }
  }
}
