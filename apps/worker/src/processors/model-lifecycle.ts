/**
 * @module worker/processors/model-lifecycle
 * @ownership ai-platform
 * BullMQ processor that orchestrates AI model lifecycle jobs via ModelLifecycleService.
 */

import { Job } from 'bullmq';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { logger } from '../lib/logger.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ModelLifecycleService } from '../services/model-lifecycle.service.js';
import type { ModelLifecycleJobV1 } from '@cnc-quote/shared';

export type ModelLifecyclePayload = ModelLifecycleJobV1;

export async function processModelLifecycle(job: Job<ModelLifecyclePayload>): Promise<void> {
  const tracer = trace.getTracer('worker');

  return tracer.startActiveSpan('model.lifecycle.job', async (span) => {
    span.setAttribute('job.id', job.id ?? '');
    span.setAttribute('model.id', job.data?.modelId ?? 'unknown');
    span.setAttribute('model.action', job.data?.action ?? 'unknown');

    try {
      const supabase = getSupabaseClient();
      const service = new ModelLifecycleService(supabase);
      await service.handle(job.data);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      logger.error({ jobId: job.id, error }, 'Model lifecycle job failed');
      throw error;
    } finally {
      span.end();
    }
  });
}
