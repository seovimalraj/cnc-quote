/**
 * @module worker/services/model-lifecycle
 * @ownership ai-platform
 * Executes lifecycle actions (retrain, rollback, bias review scheduling) for AI models by
 * coordinating Supabase persistence, model gateway dispatch, and observability spans.
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getModelConfig,
  type ModelLifecycleJobV1,
  type ModelConfig,
} from '@cnc-quote/shared';
import { getModelGatewayClient } from '../lib/model-gateway-client.js';
import { logger } from '../lib/logger.js';

interface RunRecord {
  id: string;
}

export class ModelLifecycleService {
  private readonly tracer = trace.getTracer('worker.model-lifecycle');

  constructor(private readonly supabase: SupabaseClient) {}

  async handle(job: ModelLifecycleJobV1): Promise<void> {
    return this.tracer.startActiveSpan('model.lifecycle', async (span) => {
      span.setAttribute('ai.model_id', job.modelId);
      span.setAttribute('ai.model_action', job.action);
      if (job.traceId) {
        span.setAttribute('ai.trace_id', job.traceId);
      }
      const modelConfig = getModelConfig(job.modelId);
      let run: RunRecord | null = null;

      try {
        run = await this.createRun(modelConfig, job);
        span.setAttribute('ai.run_id', run.id);
        switch (job.action) {
          case 'retrain':
            await this.dispatchRetrain(modelConfig, job, run.id);
            break;
          case 'rollback':
            await this.dispatchRollback(modelConfig, job, run.id);
            break;
          case 'bias_review':
            await this.scheduleBiasReview(modelConfig, job, run.id);
            break;
          default:
            throw new Error(`Unsupported model lifecycle action: ${job.action}`);
        }
        await this.markRun(run.id, 'succeeded');
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        const message = (error as Error).message ?? 'Unknown model lifecycle error';
        if (run?.id) {
          await this.markRun(run.id, 'failed', message);
        }
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        logger.error({ job, error: message }, 'Model lifecycle job failed');
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async createRun(model: ModelConfig, job: ModelLifecycleJobV1): Promise<RunRecord> {
    if (job.runId) {
      const { error } = await this.supabase
        .from('ai_model_runs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.runId);

      if (error) {
        throw new Error(`Failed to mark queued run as processing: ${error.message}`);
      }

      return { id: job.runId };
    }

    const { data, error } = await this.supabase
      .from('ai_model_runs')
      .insert({
        model_id: model.id,
        action: job.action,
        status: 'processing',
        target_version: job.targetVersion ?? null,
        triggered_by: job.triggeredBy ?? null,
        git_ref: job.gitRef ?? null,
        trace_id: job.traceId ?? null,
        reason: job.reason ?? null,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Failed to create model lifecycle run: ${error?.message ?? 'unknown error'}`);
    }

    return { id: (data as { id: string }).id };
  }

  private async markRun(runId: string, status: 'succeeded' | 'failed', errorMessage?: string): Promise<void> {
    const payload: Record<string, unknown> = {
      status,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (errorMessage) {
      payload.error_message = errorMessage;
    }

    const { error } = await this.supabase
      .from('ai_model_runs')
      .update(payload)
      .eq('id', runId);

    if (error) {
      logger.warn({ runId, error }, 'Failed to update model lifecycle run status');
    }
  }

  private async dispatchRetrain(model: ModelConfig, job: ModelLifecycleJobV1, runId: string): Promise<void> {
    const gateway = getModelGatewayClient();
    await gateway.control(
      'retrain',
      {
        modelId: model.id,
        deployment: model.deployment,
        targetVersion: job.targetVersion ?? null,
        datasetRef: model.datasetRef,
        gitRef: job.gitRef ?? null,
        reason: job.reason ?? null,
        requester: job.triggeredBy ?? null,
      },
      job.traceId ?? undefined,
    );

    logger.info({ modelId: model.id, runId }, 'Dispatched model retrain request');
  }

  private async dispatchRollback(model: ModelConfig, job: ModelLifecycleJobV1, runId: string): Promise<void> {
    const gateway = getModelGatewayClient();
    const targetVersion = job.targetVersion;
    if (!targetVersion) {
      throw new Error('Rollback requires targetVersion');
    }

    await gateway.control(
      'rollback',
      {
        modelId: model.id,
        deployment: model.deployment,
        targetVersion,
        reason: job.reason ?? 'rollback-request',
        requester: job.triggeredBy ?? null,
      },
      job.traceId ?? undefined,
    );

    logger.warn({ modelId: model.id, runId, targetVersion }, 'Dispatched model rollback request');
  }

  private async scheduleBiasReview(model: ModelConfig, job: ModelLifecycleJobV1, runId: string): Promise<void> {
    const { error } = await this.supabase.from('ai_model_bias_reviews').insert({
      model_id: model.id,
      run_id: runId,
      status: 'pending',
      scheduled_for: new Date().toISOString(),
      stakeholders: model.domainExperts,
      checklist_url: model.biasChecklist,
      trace_id: job.traceId ?? null,
    });

    if (error) {
      throw new Error(`Failed to persist bias review row: ${error.message}`);
    }

    logger.info({ modelId: model.id, runId }, 'Queued bias review reminder for model');
  }
}
