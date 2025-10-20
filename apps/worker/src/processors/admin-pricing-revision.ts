import { Job } from 'bullmq';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { getSupabaseClient } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { AdminPricingRevisionAssistantService } from '../services/admin-pricing-revision-assistant.service.js';
import {
  incrementAdminPricingRevisionFailure,
  recordAdminPricingRevisionLatency,
} from '../lib/admin-pricing-revision-metrics.js';

export interface AdminPricingRevisionPayload {
  version: 1;
  runId: string;
  traceId?: string | null;
  orgId?: string | null;
  requestedBy?: string | null;
}

export async function processAdminPricingRevision(job: Job<AdminPricingRevisionPayload>) {
  const tracer = trace.getTracer('worker');

  return tracer.startActiveSpan('admin.pricing_revision.generate', async (span) => {
    const startedAt = Date.now();
    let succeeded = false;

    span.setAttribute('admin.pricing_revision.run_id', job.data?.runId ?? '');
    if (job.data?.traceId) {
      span.setAttribute('admin.pricing_revision.trace_id', job.data.traceId);
    }
    if (job.data?.orgId) {
      span.setAttribute('admin.pricing_revision.org_id', job.data.orgId);
    }
    if (job.data?.requestedBy) {
      span.setAttribute('admin.pricing_revision.requested_by', job.data.requestedBy);
    }

    try {
      const supabase = getSupabaseClient();
      const service = new AdminPricingRevisionAssistantService(supabase);
      await service.execute(job.data.runId, {
        traceId: job.data.traceId ?? null,
        orgId: job.data.orgId ?? null,
        requestedBy: job.data.requestedBy ?? null,
      });
      succeeded = true;
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      incrementAdminPricingRevisionFailure({ runId: job.data?.runId ?? 'unknown' });
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      logger.error({ error, jobId: job.id, runId: job.data?.runId }, 'Admin pricing revision assistant job failed');
      throw error;
    } finally {
      recordAdminPricingRevisionLatency(Date.now() - startedAt, {
        runId: job.data?.runId ?? 'unknown',
        outcome: succeeded ? 'success' : 'failure',
      });
      span.end();

      if (succeeded) {
        logger.info({ jobId: job.id, runId: job.data?.runId }, 'Completed admin pricing revision assistant job');
      }
    }
  });
}
