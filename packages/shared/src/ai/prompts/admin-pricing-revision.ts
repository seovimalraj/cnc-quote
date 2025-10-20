/**
 * @module ai/prompts/admin-pricing-revision
 * @ownership ai-platform
 * Deterministic prompt surfaces for the admin pricing revision assistant. Guardrails and
 * metadata are version-controlled to support traceability, rollback, and bias reviews.
 */

import type { z } from 'zod';
import { AdminPricingConfigSchema } from '../../admin-pricing.types';
import type { PromptDescriptor } from '../prompt-registry';

const SYSTEM_PROMPT_VERSION = '2025-10-20.1';
const USER_PROMPT_VERSION = '2025-10-20.1';

export type AdminPricingConfig = z.infer<typeof AdminPricingConfigSchema>;

export interface AdminPricingRevisionSystemContext {}

export interface AdminPricingRevisionUserContext {
  instructions: string;
  focusAreas?: string[];
  baseConfig: AdminPricingConfig;
  baseVersion: string | number;
}

export const ADMIN_PRICING_REVISION_SYSTEM_PROMPT: PromptDescriptor<
  'admin-pricing-revision/system',
  AdminPricingRevisionSystemContext
> = {
  id: 'admin-pricing-revision/system',
  version: SYSTEM_PROMPT_VERSION,
  description: 'System instructions governing pricing config change proposals',
  owners: ['pricing-platform'],
  lastReviewedAt: '2025-10-20',
  domainReviewers: ['pricing-guild', 'finance-ops'],
  guardrails: [
    'Respond only with JSON payload matching documented schema',
    'Constrain adjustments to supported configuration roots and deterministic math',
    'Forbid speculative or non-numeric adjustments',
  ],
  runbooks: [
    'docs/runbooks/ai-model-incident.md',
    'docs/governance/ai-ml-posture.md',
  ],
  render: () =>
    `You are a deterministic CNC pricing configurator.
Respond only with JSON matching schema: {"targetVersion?": string, "notes?": string, "adjustments": [{"path": string, "type": "set"|"add"|"multiply", "value": number, "reason": string}]}.
Use conservative adjustments grounded in provided configuration. Do not fabricate fields.`,
};

export const ADMIN_PRICING_REVISION_USER_PROMPT: PromptDescriptor<
  'admin-pricing-revision/user',
  AdminPricingRevisionUserContext
> = {
  id: 'admin-pricing-revision/user',
  version: USER_PROMPT_VERSION,
  description: 'User prompt context for pricing revision assistant runs',
  owners: ['pricing-platform'],
  lastReviewedAt: '2025-10-20',
  domainReviewers: ['pricing-guild'],
  guardrails: [
    'Include only whitelisted configuration metrics to prevent prompt explosion',
    'Preserve operator instructions verbatim while ensuring newline separation',
  ],
  runbooks: ['docs/runbooks/ai-model-incident.md'],
  render: ({ instructions, focusAreas, baseConfig, baseVersion }) => {
    const lines: string[] = [];
    lines.push(`Current pricing configuration version: ${baseVersion}`);
    if (focusAreas?.length) {
      lines.push(`Focus areas: ${focusAreas.join(', ')}`);
    }
    lines.push('Instructions:');
    lines.push(instructions);
    lines.push('---');
    lines.push('Selected configuration metrics (JSON):');

    const summary = {
      overhead_margin: baseConfig.overhead_margin,
      speed_region: baseConfig.speed_region,
      risk_matrix: baseConfig.risk_matrix,
    };

    lines.push(JSON.stringify(summary, null, 2));
    lines.push('Return only the JSON response with adjustments.');
    return lines.join('\n');
  },
};

export function renderAdminPricingRevisionSystemPrompt(): {
  prompt: string;
  metadata: PromptDescriptor<'admin-pricing-revision/system', AdminPricingRevisionSystemContext>;
} {
  return {
    prompt: ADMIN_PRICING_REVISION_SYSTEM_PROMPT.render({}),
    metadata: ADMIN_PRICING_REVISION_SYSTEM_PROMPT,
  };
}

export function renderAdminPricingRevisionUserPrompt(context: AdminPricingRevisionUserContext): {
  prompt: string;
  metadata: PromptDescriptor<'admin-pricing-revision/user', AdminPricingRevisionUserContext>;
} {
  return {
    prompt: ADMIN_PRICING_REVISION_USER_PROMPT.render(context),
    metadata: ADMIN_PRICING_REVISION_USER_PROMPT,
  };
}
