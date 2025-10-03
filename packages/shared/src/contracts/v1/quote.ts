import { PartConfigV1 } from './part-config';

export type QuoteLifecycleStatusV1 =
  | 'draft'
  | 'processing'
  | 'ready'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface QuoteItemV1 extends PartConfigV1 {}

export interface QuotePricingTotalsV1 {
  subtotal: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency: string;
}

export interface QuoteMetaV1 {
  expires_at?: string;
  email_sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteV1 {
  id: string;
  org_id: string;
  customer_id: string;
  status: QuoteLifecycleStatusV1;
  items: QuoteItemV1[];
  pricing: QuotePricingTotalsV1;
  notes?: string;
  terms?: string;
  meta: QuoteMetaV1;
}

// API Response variant with additional computed fields
export interface QuoteSummaryV1 extends QuoteV1 {
  customer?: {
    email: string;
    name: string;
  };
  created_by?: string;
}

// ---------------------------
// Quote Revisions (Phase 1 scaffolding)
// ---------------------------
export interface QuoteRevisionSummaryV1 {
  id: string;               // revision uuid
  quote_id: string;         // parent quote id
  revision_number: number;  // increments starting at 1
  created_at: string;
  created_by?: string;
  reason?: string;
  diff_summary: Array<{
    field: string;          // path of changed field
    previous?: any;
    current?: any;
  }>;
  status: 'draft' | 'proposed' | 'applied' | 'discarded';
}

export interface QuoteRevisionApplyResultV1 {
  quote_id: string;
  revision_id: string;
  applied_at: string;
  new_quote_summary: QuoteSummaryV1;
}

// Utility: compute a shallow diff between two quote summaries (pricing + item counts)
export function computeQuoteDiffSummaryV1(prev: Partial<QuoteSummaryV1>, curr: Partial<QuoteSummaryV1>): QuoteRevisionSummaryV1['diff_summary'] {
  const diffs: QuoteRevisionSummaryV1['diff_summary'] = [];
  const push = (field: string, previous: any, current: any) => {
    if (previous === current) return;
    diffs.push({ field, previous, current });
  };
  if (prev.pricing && curr.pricing) {
    push('pricing.subtotal', prev.pricing.subtotal, curr.pricing.subtotal);
    push('pricing.tax', prev.pricing.tax, curr.pricing.tax);
    push('pricing.shipping', prev.pricing.shipping, curr.pricing.shipping);
    push('pricing.total', prev.pricing.total, curr.pricing.total);
  }
  push('items.length', (prev.items||[]).length, (curr.items||[]).length);
  // Basic status change
  push('status', (prev as any).status, (curr as any).status);
  return diffs;
}
