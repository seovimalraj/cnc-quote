import type { ContractsV1 } from '@cnc-quote/shared';

export const PRICING_COMPLIANCE_ML_QUEUE = 'compliance-ml-assist' as const;
export const PRICING_COMPLIANCE_ML_JOB = 'generate-compliance-rationale' as const;

export type PricingComplianceMlAssistJob = ContractsV1.QuoteComplianceMlAssistJobV1;
