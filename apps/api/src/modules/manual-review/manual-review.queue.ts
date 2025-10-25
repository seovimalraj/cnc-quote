import type { PricingComplianceEventCode } from "../lib/pricing-core/pricing-compliance.service";

export const MANUAL_REVIEW_QUEUE = "manual-review" as const;
export const MANUAL_REVIEW_JOB_PRICING_COMPLIANCE = "pricing-compliance-escalation" as const;

export interface PricingComplianceGuardrailJob {
  version: 1;
  triggeredBy: "pricing_compliance";
  quoteId: string;
  quoteItemId: string;
  orgId: string;
  traceId: string;
  triggeredAt: string;
  eventIds: string[];
  events: Array<{
    code: PricingComplianceEventCode;
    message: string;
    quantity: number;
    partId?: string | null;
  }>;
  quote?: {
    status?: string | null;
    createdBy?: string | null;
    userId?: string | null;
    number?: string | null;
  };
  part?: {
    id?: string | null;
    number?: string | null;
  };
  traceparent?: string;
}
