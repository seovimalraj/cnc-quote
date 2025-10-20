/**
 * @module Contracts/AIModel
 * @ownership ai-platform
 * Contracts for AI model lifecycle persistence (training runs, rollbacks, bias reviews).
 */

import type { ModelId, ModelLifecycleAction } from '../../ai/model-registry';

export type AIModelRunStatusV1 = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface AIModelRunV1 {
  id: string;
  modelId: ModelId;
  action: ModelLifecycleAction;
  status: AIModelRunStatusV1;
  targetVersion?: string | null;
  triggeredBy?: string | null;
  gitRef?: string | null;
  traceId?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
}

export type AIModelReviewStatusV1 = 'pending' | 'acknowledged' | 'completed';

export interface AIModelBiasReviewV1 {
  id: string;
  modelId: ModelId;
  scheduledFor: string;
  status: AIModelReviewStatusV1;
  stakeholders: string[];
  checklistUrl: string;
  runId?: string | null;
  traceId?: string | null;
  createdAt: string;
  updatedAt: string;
}
