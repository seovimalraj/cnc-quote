/**
 * @module ai/model-lifecycle.types
 * @ownership ai-platform
 * Shared contract definitions for AI model lifecycle jobs dispatched over BullMQ and persisted
 * in Supabase audit tables.
 */

import type { ModelId, ModelLifecycleAction } from './model-registry';

export interface ModelLifecycleJobV1 {
  version: 1;
  modelId: ModelId;
  action: ModelLifecycleAction;
  targetVersion?: string | null;
  triggeredBy?: string | null;
  reason?: string | null;
  gitRef?: string | null;
  traceId?: string | null;
  runId?: string | null;
}

export interface ModelLifecycleResultV1 {
  version: 1;
  modelId: ModelId;
  action: ModelLifecycleAction;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  message?: string;
  runId: string;
  startedAt: string;
  completedAt?: string | null;
}

export const MODEL_LIFECYCLE_QUEUE = 'ai-model-lifecycle' as const;
