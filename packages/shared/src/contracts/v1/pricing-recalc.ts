/**
 * Pricing Recalculation Contracts (v1)
 * Defines the payload used to trigger background repricing when admin settings change.
 */

export const PRICING_RECALC_REASON = [
  'pricing-config-published',
  'admin-override',
  'manual',
] as const;

export type PricingRecalcReasonV1 = typeof PRICING_RECALC_REASON[number];

export interface PricingRecalcJobV1 {
  version: 1;
  traceId: string;
  orgId: string | null;
  requestedBy?: string | null;
  reason: PricingRecalcReasonV1;
  // Optional scope narrowing. If omitted, reprice all eligible active quotes for the org
  targetQuoteIds?: string[] | null;
  // Optional safety valve to compute and emit diffs without mutating quote state
  dryRun?: boolean;
  // Optional linkage to persisted run record (for status reporting)
  runId?: string | null;
  // Granular scope filters to minimize blast radius
  materials?: string[] | null;
  processes?: string[] | null;
  machineGroups?: string[] | null;
  createdFrom?: string | null; // ISO timestamp
  createdTo?: string | null;   // ISO timestamp
}
