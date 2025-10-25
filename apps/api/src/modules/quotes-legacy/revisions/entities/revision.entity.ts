/**
 * Step 15: Quote Revision Entity
 * Represents a pricing revision with diff data
 */

export interface QuoteRevision {
  id: string;
  quote_id: string;
  user_id: string | null;
  created_at: Date;
  diff_json: PricingDiff;
  note: string | null;
  restore_of_revision_id: string | null;
  pricing_version_old: string | null;
  pricing_version_new: string | null;
  total_delta: number | null;
  pct_delta: number | null;
}

export interface PricingDiff {
  total_delta: number;
  pct_delta: number;
  line_items: PricingDiffLineItem[];
  lead_time_delta_days: number | null;
  tax_delta: number | null;
  warnings: string[];
  old_pricing_version: string;
  new_pricing_version: string;
}

export interface PricingDiffLineItem {
  factor: string;
  old: number;
  new: number;
  delta: number;
  delta_pct: number;
  reason: string | null;
}

export interface PricingBreakdown {
  setup_time_cost: number;
  machine_time_cost: number;
  material_cost: number;
  finish_cost: number;
  risk_markup: number;
  tolerance_multiplier_cost: number;
  overhead_cost: number;
  margin_amount: number;
  subtotal: number;
  tax: number;
  total: number;
  lead_time_days?: number;
}

export type QuoteStatus = 'draft' | 'active' | 'expired' | 'won' | 'lost';
