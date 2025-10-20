/**
 * @module api/ai/model-lifecycle.service
 * @ownership ai-platform
 * Coordinates AI model lifecycle jobs by writing queued run entries and dispatching BullMQ jobs.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  getModelConfig,
  type ModelId,
  type ModelLifecycleJobV1,
} from '@cnc-quote/shared';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { AI_MODEL_LIFECYCLE_JOB, AI_MODEL_LIFECYCLE_QUEUE } from './model-lifecycle.queue';

interface LifecycleOptions {
  targetVersion?: string;
  gitRef?: string;
  reason?: string;
  triggeredBy?: string | null;
  traceId?: string | null;
}

@Injectable()
export class AIModelLifecycleService {
  private readonly logger = new Logger(AIModelLifecycleService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue(AI_MODEL_LIFECYCLE_QUEUE)
    private readonly queue: Queue<ModelLifecycleJobV1>,
  ) {}

  async scheduleRetrain(modelId: ModelId, options: LifecycleOptions = {}): Promise<{ runId: string }> {
    const config = getModelConfig(modelId);
    this.logger.log(`Scheduling retrain for model ${config.id}`);

    const runId = await this.createQueuedRun(modelId, 'retrain', options);
    await this.enqueueJob({
      version: 1,
      modelId,
      action: 'retrain',
      targetVersion: options.targetVersion ?? null,
      triggeredBy: options.triggeredBy ?? null,
      gitRef: options.gitRef ?? null,
      reason: options.reason ?? 'scheduled-retrain',
      traceId: options.traceId ?? null,
      runId,
    });

    return { runId };
  }

  async scheduleRollback(modelId: ModelId, options: LifecycleOptions & { targetVersion: string }): Promise<{ runId: string }> {
    if (!options.targetVersion) {
      throw new BadRequestException('Rollback requires targetVersion');
    }
    const config = getModelConfig(modelId);
    this.logger.warn(`Scheduling rollback for model ${config.id} to ${options.targetVersion}`);

    const runId = await this.createQueuedRun(modelId, 'rollback', options);
    await this.enqueueJob({
      version: 1,
      modelId,
      action: 'rollback',
      targetVersion: options.targetVersion,
      triggeredBy: options.triggeredBy ?? null,
      gitRef: options.gitRef ?? null,
      reason: options.reason ?? 'scheduled-rollback',
      traceId: options.traceId ?? null,
      runId,
    });

    return { runId };
  }

  async scheduleBiasReview(modelId: ModelId, options: LifecycleOptions = {}): Promise<{ runId: string }> {
    const config = getModelConfig(modelId);
    this.logger.log(`Scheduling bias review job for model ${config.id}`);

    const runId = await this.createQueuedRun(modelId, 'bias_review', options);
    await this.enqueueJob({
      version: 1,
      modelId,
      action: 'bias_review',
      reason: options.reason ?? 'manual-bias-review',
      triggeredBy: options.triggeredBy ?? null,
      traceId: options.traceId ?? null,
      runId,
    });

    return { runId };
  }

  private async createQueuedRun(modelId: ModelId, action: ModelLifecycleJobV1['action'], options: LifecycleOptions): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('ai_model_runs')
      .insert({
        model_id: modelId,
        action,
        status: 'queued',
        target_version: options.targetVersion ?? null,
        triggered_by: options.triggeredBy ?? null,
        git_ref: options.gitRef ?? null,
        trace_id: options.traceId ?? null,
        reason: options.reason ?? null,
      })
      .select('id')
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException(`Failed to queue lifecycle run: ${error?.message ?? 'unknown error'}`);
    }

    return (data as { id: string }).id;
  }

  private async enqueueJob(payload: ModelLifecycleJobV1): Promise<void> {
    await this.queue.add(
      AI_MODEL_LIFECYCLE_JOB,
      payload,
      {
        jobId: `${AI_MODEL_LIFECYCLE_JOB}:${payload.modelId}:${payload.action}:${payload.runId ?? 'anon'}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
