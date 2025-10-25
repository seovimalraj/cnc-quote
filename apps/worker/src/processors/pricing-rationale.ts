import { Job } from 'bullmq';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { PricingRationaleSummaryJobV1 } from '@cnc-quote/shared/dist/contracts/v1';
import { getSupabaseClient } from '../lib/supabase.js';
import { getRedisClient } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { PricingRationaleService } from '../services/pricing-rationale.service.js';
import { incrementPricingRationaleFailure, recordPricingRationaleLatency } from '../lib/pricing-rationale-metrics.js';

export type PricingRationalePayload = PricingRationaleSummaryJobV1;

export async function processPricingRationale(job: Job<PricingRationalePayload>) {
  const tracer = trace.getTracer('worker');

  return tracer.startActiveSpan('pricing.rationale.summarize', async (span) => {
    const start = Date.now();
    let succeeded = false;

    span.setAttribute('job.id', job.id ?? '');
    span.setAttribute('quote.id', job.data?.quoteId ?? '');
    span.setAttribute('quote.org_id', job.data?.orgId ?? '');
    span.setAttribute('pricing.cost_sheet_hash', job.data?.costSheetHash ?? '');
    if (job.data?.traceId) {
      span.setAttribute('pricing.parent_trace_id', job.data.traceId);
    }

    try {
      const supabase = getSupabaseClient();
      const redis = getRedisClient();
      const service = new PricingRationaleService(supabase, redis);
      const result = await service.generateAndPersist(job.data);
      succeeded = true;
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      incrementPricingRationaleFailure({
        quoteId: job.data?.quoteId ?? 'unknown',
        orgId: job.data?.orgId ?? 'unknown',
      });
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      logger.error({ error, jobId: job.id, quoteId: job.data?.quoteId }, 'Failed pricing rationale job');
      throw error;
    } finally {
      const durationMs = Date.now() - start;
      recordPricingRationaleLatency(durationMs, {
        quoteId: job.data?.quoteId ?? 'unknown',
        orgId: job.data?.orgId ?? 'unknown',
        outcome: succeeded ? 'success' : 'failure',
      });
      span.end();
      if (succeeded) {
        logger.info(
          {
            jobId: job.id,
            quoteId: job.data?.quoteId,
            costSheetHash: job.data?.costSheetHash,
          },
          'Completed pricing rationale job',
        );
      }
    }
  });
}
