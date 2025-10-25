import type { ContractsV1 } from '@cnc-quote/shared';

export const PRICING_RATIONALE_QUEUE = 'pricing-rationale' as const;
export const PRICING_RATIONALE_JOB = 'pricing-rationale-summarize' as const;

export type PricingRationaleSummaryJob = ContractsV1.PricingRationaleSummaryJobV1;
