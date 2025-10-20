import { Job } from 'bullmq';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { logger } from '../lib/logger.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { getMetricsPublisher } from '../lib/pushgateway.js';
import { ComplianceAnalyticsService, ComplianceAnalyticsOptions, ComplianceAnalyticsResult } from '../services/compliance-analytics.service.js';

/**
 * Nightly compliance analytics job payload supports manual overrides for QA.
 */
export interface ComplianceAnalyticsPayload {
  bucketDate?: string;
  windowHours?: number;
}

export async function processComplianceAnalytics(
  job: Job<ComplianceAnalyticsPayload>,
): Promise<ComplianceAnalyticsResult> {
  const tracer = trace.getTracer('worker');

  return tracer.startActiveSpan('worker.compliance-analytics.process', async (span) => {
    try {
      const supabase = getSupabaseClient();
      const metricsPublisher = getMetricsPublisher();
      const service = new ComplianceAnalyticsService(supabase, metricsPublisher);

      const options: ComplianceAnalyticsOptions = {
        bucketDate: job.data?.bucketDate ? new Date(job.data.bucketDate) : undefined,
        windowHours: job.data?.windowHours,
      };

      const result = await service.run(options);
      logger.info({ jobId: job.id, result }, 'Completed compliance analytics rollup');
      span.setAttribute('job.id', job.id ?? '');
      span.setAttribute('analytics.bucket', result.bucketDate);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      logger.error({ error, jobId: job.id }, 'Failed to process compliance analytics job');
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}
