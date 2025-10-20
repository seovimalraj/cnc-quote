/**
 * @module ai/prompt-registry
 * @ownership ai-platform
 * Canonical registry for AI prompt descriptors. Each prompt entry carries ownership,
 * version metadata, review cadence, and associated runbooks to satisfy audit traceability.
 */

export interface PromptDescriptor<Id extends string = string, Context = unknown> {
  id: Id;
  version: string;
  description: string;
  owners: string[];
  lastReviewedAt: string;
  domainReviewers: string[];
  guardrails: string[];
  runbooks: string[];
  render(context: Context): string;
}

export type PromptId = PromptDescriptor['id'];

import {
  PRICING_RATIONALE_SYSTEM_PROMPT,
  PRICING_RATIONALE_USER_PROMPT,
} from './prompts/pricing-rationale';
import {
  ADMIN_PRICING_REVISION_SYSTEM_PROMPT,
  ADMIN_PRICING_REVISION_USER_PROMPT,
} from './prompts/admin-pricing-revision';

const PROMPTS: Record<PromptId, PromptDescriptor<any, any>> = {
  [PRICING_RATIONALE_SYSTEM_PROMPT.id]: PRICING_RATIONALE_SYSTEM_PROMPT,
  [PRICING_RATIONALE_USER_PROMPT.id]: PRICING_RATIONALE_USER_PROMPT,
  [ADMIN_PRICING_REVISION_SYSTEM_PROMPT.id]: ADMIN_PRICING_REVISION_SYSTEM_PROMPT,
  [ADMIN_PRICING_REVISION_USER_PROMPT.id]: ADMIN_PRICING_REVISION_USER_PROMPT,
};

export function getPromptDescriptor<TContext>(
  id: PromptId,
): PromptDescriptor<PromptId, TContext> {
  const descriptor = PROMPTS[id];
  if (!descriptor) {
    throw new Error(`Prompt descriptor ${id} not registered`);
  }
  return descriptor as PromptDescriptor<PromptId, TContext>;
}

export function listPromptDescriptors(): PromptDescriptor[] {
  return Object.values(PROMPTS);
}
