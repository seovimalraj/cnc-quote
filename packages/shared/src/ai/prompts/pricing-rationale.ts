/**
 * @module ai/prompts/pricing-rationale
 * @ownership ai-platform
 * Deterministic prompt builders for pricing rationale generation. Centralized here so
 * prompt text, metadata, and review cadence remain version-controlled alongside model
 * configurations. Changes require domain sign-off recorded in docs/governance/ai-ml-posture.md.
 */

import type {
  PricingRationaleSummaryJobV1,
  QuoteRationaleCostSheetV1,
} from '../../contracts/v1/pricing-rationale';
import type { QuoteRationaleHighlightCategoryV1 } from '../../contracts/v1/pricing-rationale';
import type { PromptDescriptor } from '../prompt-registry';

const USER_PROMPT_VERSION = '2025-10-20.1';
const SYSTEM_PROMPT_VERSION = '2025-10-20.1';
const HIGHLIGHT_LIMIT = 6;

export interface PricingRationaleSystemContext {
  subtotal: number;
  currency: string;
  highlightLimit?: number;
}

export interface PricingRationaleUserContext {
  costSheet: QuoteRationaleCostSheetV1;
  itemLimit?: number;
}

export const PRICING_RATIONALE_SYSTEM_PROMPT: PromptDescriptor<
  'pricing-rationale/system',
  PricingRationaleSystemContext
> = {
  id: 'pricing-rationale/system',
  version: SYSTEM_PROMPT_VERSION,
  description: 'System guardrails for deterministic CNC pricing rationale summaries',
  owners: ['pricing-platform'],
  lastReviewedAt: '2025-10-20',
  domainReviewers: ['finance-ops', 'pricing-guild'],
  guardrails: [
    'Respond strictly in JSON with keys summaryText and breakdownHighlights',
    'Cap highlights to deterministic limit and forbid speculative adjustments',
    'Ground recommendations in provided subtotal/currency context',
  ],
  runbooks: ['docs/runbooks/ai-model-incident.md'],
  render: (context) => {
    const highlightLimit = context.highlightLimit ?? HIGHLIGHT_LIMIT;
    return (
      `You are a deterministic CNC pricing analyst.\n` +
      `Summarize pricing outcomes for pricing teams.\n` +
      'Rules:\n' +
      '- Respond in strict JSON with keys summaryText and breakdownHighlights.\n' +
      `- Use at most ${highlightLimit} highlights. Each highlight must include category ` +
      '(material|machining|setup|finish|inspection|overhead|margin|lead_time|logistics|surcharge|discount|other) and a concise description.\n' +
      '- Provide numeric amountImpact (USD) or null. Provide percentImpact (percentage difference) or null.\n' +
      `- Emphasize drivers affecting subtotal ${formatCurrency(context.subtotal)} in ${context.currency} using deterministic facts only.\n` +
      '- Never suggest altering totals directly; label opportunities or risks only.'
    );
  },
};

export const PRICING_RATIONALE_USER_PROMPT: PromptDescriptor<
  'pricing-rationale/user',
  PricingRationaleUserContext
> = {
  id: 'pricing-rationale/user',
  version: USER_PROMPT_VERSION,
  description: 'Structured cost sheet expansion for pricing rationale generations',
  owners: ['pricing-platform'],
  lastReviewedAt: '2025-10-20',
  domainReviewers: ['finance-ops'],
  guardrails: [
    'Limit cost sheet projection to deterministic data already persisted',
    'Surface compliance flags without embellishment',
    'Exclude more than 6 items to keep prompt bounded',
  ],
  runbooks: ['docs/runbooks/ai-model-incident.md'],
  render: ({ costSheet, itemLimit }) => {
    const limit = itemLimit ?? HIGHLIGHT_LIMIT;
    const lines: string[] = [
      `Quote ${costSheet.quoteId} priced in ${costSheet.currency}`,
      `Subtotal: ${formatCurrency(costSheet.subtotal)} (pricing version ${costSheet.pricingVersion})`,
    ];

    costSheet.items.slice(0, limit).forEach((item, index) => {
      lines.push(
        [
          `Item ${index + 1}: quantity ${formatNumber(item.quantity)}, unit ${formatCurrency(item.unitPrice)}, total ${formatCurrency(item.totalPrice)}`,
          item.leadTimeDays ? `lead time ${formatNumber(item.leadTimeDays)} days` : null,
          item.breakdown ? `breakdown: ${formatBreakdown(item.breakdown)}` : null,
          item.compliance?.flags?.length
            ? `compliance alerts: ${item.compliance.flags.map((flag) => `${flag.code}:${flag.severity}`).join(', ')}`
            : null,
        ]
          .filter(Boolean)
          .join(' | '),
      );
    });

    return lines.join('\n');
  },
};

export function renderPricingRationaleSystemPrompt(job: PricingRationaleSummaryJobV1): {
  prompt: string;
  metadata: PromptDescriptor<'pricing-rationale/system', PricingRationaleSystemContext>;
} {
  const prompt = PRICING_RATIONALE_SYSTEM_PROMPT.render({
    subtotal: job.costSheet.subtotal,
    currency: job.costSheet.currency,
  });
  return { prompt, metadata: PRICING_RATIONALE_SYSTEM_PROMPT };
}

export function renderPricingRationaleUserPrompt(costSheet: QuoteRationaleCostSheetV1): {
  prompt: string;
  metadata: PromptDescriptor<'pricing-rationale/user', PricingRationaleUserContext>;
} {
  const prompt = PRICING_RATIONALE_USER_PROMPT.render({ costSheet });
  return { prompt, metadata: PRICING_RATIONALE_USER_PROMPT };
}

function formatCurrency(value: unknown): string {
  const numeric = toNullableNumber(value) ?? 0;
  return numeric.toFixed(2);
}

function formatNumber(value: unknown): string {
  const numeric = toNullableNumber(value);
  return numeric === null ? 'n/a' : numeric.toString();
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function formatBreakdown(breakdown: Record<string, unknown>): string {
  return Object.entries(breakdown)
    .map(([key, value]) => `${key}=${formatNumber(value as number)}`)
    .join(', ');
}

export const PRICING_RATIONALE_PROMPT_CATEGORIES: QuoteRationaleHighlightCategoryV1[] = [
  'material',
  'machining',
  'setup',
  'finish',
  'inspection',
  'overhead',
  'margin',
  'lead_time',
  'logistics',
  'surcharge',
  'discount',
  'other',
];
