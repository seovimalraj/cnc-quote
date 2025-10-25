// Recalc run and item status contracts (v1)

export type PricingRecalcRunStatusV1 =
  | 'queued'
  | 'running'
  | 'partial'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export type PricingRecalcItemStatusV1 =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface PricingRecalcRunV1 {
  id: string;
  orgId: string;
  reason: string;
  requestedBy?: string | null;
  status: PricingRecalcRunStatusV1;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  totalCount?: number | null;
  successCount?: number | null;
  failedCount?: number | null;
  skippedCount?: number | null;
  dryRun?: boolean;
  version?: string | null; // pricing config version at time of run
  scope?: {
    materials?: string[] | null;
    processes?: string[] | null;
    machineGroups?: string[] | null;
    createdFrom?: string | null;
    createdTo?: string | null;
    targetQuoteIds?: string[] | null;
  } | null;
  error?: string | null;
}

export interface PricingRecalcItemV1 {
  id: string;
  runId: string;
  orgId: string;
  quoteId: string;
  quoteItemId: string;
  status: PricingRecalcItemStatusV1;
  startedAt?: string | null;
  finishedAt?: string | null;
  deltaTotal?: number | null; // delta on quote total or line total if available
  error?: string | null;
}
