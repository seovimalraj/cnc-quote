export const ADMIN_PRICING_REVISION_QUEUE = 'admin-pricing-revision-assistant' as const;
export const ADMIN_PRICING_REVISION_JOB = 'admin-pricing-revision-generate' as const;

export interface AdminPricingRevisionAssistantJob {
  version: 1;
  runId: string;
  traceId?: string | null;
  orgId?: string | null;
  requestedBy?: string | null;
}
