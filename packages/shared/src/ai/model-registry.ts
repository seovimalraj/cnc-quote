/**
 * @module ai/model-registry
 * @ownership ai-platform
 * Registry for all AI model deployments the platform interacts with. Each entry pins the model
 * artifact, bound prompts, retraining cadence, rollback workflow, and bias review ownership so
 * the lifecycle can be automated safely and audited.
 */

import type { PromptId } from './prompt-registry';

export type ModelLifecycleAction = 'retrain' | 'rollback' | 'bias_review';

export interface ModelPromptBinding {
  system: PromptId;
  user?: PromptId;
}

export interface ModelConfig {
  id: ModelId;
  provider: 'ollama' | 'openai' | 'bedrock' | 'vertex';
  deployment: string;
  prompts: ModelPromptBinding;
  gitTrackedFiles: string[];
  retrainWorkflow: string;
  rollbackWorkflow: string;
  biasReviewCron: string;
  biasChecklist: string;
  domainExperts: string[];
  maxPromptVersionSkew: number;
  datasetRef: string;
  artifactPath: string;
  runbooks: string[];
  notes?: string;
}

export type ModelId =
  | 'pricing-rationale'
  | 'admin-pricing-revision';

const MODEL_REGISTRY: Record<ModelId, ModelConfig> = {
  'pricing-rationale': {
    id: 'pricing-rationale',
    provider: 'ollama',
    deployment: 'llama3.1:8b-pricing-rationale@sha256:3f8b592',
    prompts: {
      system: 'pricing-rationale/system',
      user: 'pricing-rationale/user',
    },
    gitTrackedFiles: [
      'packages/shared/src/ai/prompts/pricing-rationale.ts',
      'ai/model-configs/pricing-rationale.yaml',
    ],
    retrainWorkflow: '.github/workflows/ai-pricing-rationale-train.yml',
    rollbackWorkflow: '.github/workflows/ai-pricing-rationale-rollback.yml',
    biasReviewCron: '0 15 1 */2 *',
    biasChecklist: 'docs/governance/ai-ml-posture.md#bias-review-checklist',
    domainExperts: ['pricing-guild', 'finance-ops'],
    maxPromptVersionSkew: 1,
    datasetRef: 's3://cnc-quote-ml-datasets/pricing-rationale/latest.parquet',
    artifactPath: 's3://cnc-quote-ml-models/pricing-rationale/',
    runbooks: [
      'docs/runbooks/ai-model-incident.md',
      'docs/governance/ai-ml-posture.md',
    ],
    notes: 'Bias review pairs pricing leadership with finance to confirm highlight balance.',
  },
  'admin-pricing-revision': {
    id: 'admin-pricing-revision',
    provider: 'ollama',
    deployment: 'llama3.1:8b-admin-pricing@sha256:91ac41d',
    prompts: {
      system: 'admin-pricing-revision/system',
      user: 'admin-pricing-revision/user',
    },
    gitTrackedFiles: [
      'packages/shared/src/ai/prompts/admin-pricing-revision.ts',
      'ai/model-configs/admin-pricing-revision.yaml',
    ],
    retrainWorkflow: '.github/workflows/ai-admin-pricing-retrain.yml',
    rollbackWorkflow: '.github/workflows/ai-admin-pricing-rollback.yml',
    biasReviewCron: '0 18 * * MON',
    biasChecklist: 'docs/governance/ai-ml-posture.md#bias-review-checklist',
    domainExperts: ['pricing-guild', 'revops'],
    maxPromptVersionSkew: 0,
    datasetRef: 's3://cnc-quote-ml-datasets/admin-pricing/latest.parquet',
    artifactPath: 's3://cnc-quote-ml-models/admin-pricing/',
    runbooks: [
      'docs/runbooks/ai-model-incident.md',
      'docs/governance/ai-ml-posture.md',
    ],
    notes: 'Rollbacks require pricing dual-control sign-off before workflow dispatch.',
  },
};

export function getModelConfig(id: ModelId): ModelConfig {
  const config = MODEL_REGISTRY[id];
  if (!config) {
    throw new Error(`Model ${id} not registered`);
  }
  return config;
}

export function listModelConfigs(): ModelConfig[] {
  return Object.values(MODEL_REGISTRY);
}
