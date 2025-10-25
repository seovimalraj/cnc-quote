import type { ContractsV1 } from '@cnc-quote/shared';

// Reuse existing 'pricing' queue to keep infra minimal
export const PRICING_RECALC_JOB = 'recalculate-org-quotes' as const;

export type PricingRecalcJob = ContractsV1.PricingRecalcJobV1;
