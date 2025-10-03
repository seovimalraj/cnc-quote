/**
 * Step 14: Quote Outcome Entity
 * TypeORM/Database entity for quote_outcomes table
 */

export interface QuoteOutcome {
  quote_id: string;
  org_id: string;
  status: 'accepted' | 'rejected' | 'expired' | 'rescinded';
  reason_code?: string;
  reason_notes?: string;
  amount?: number;
  decided_by: string;
  decided_at: Date;
  meta: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface OutcomeReasonCode {
  code: string;
  label: string;
  category: string;
  description?: string;
  active: boolean;
  sort: number;
  created_at: Date;
  updated_at: Date;
}

export interface QuoteMargins {
  id: string;
  gross_margin_amount?: number;
  gross_margin_pct?: number;
}

export interface QuoteLineMargins {
  id: string;
  quote_id: string;
  line_cost_breakdown?: {
    setup_time_cost: number;
    machine_time_cost: number;
    material_cost: number;
    finish_cost: number;
    risk_markup: number;
    tolerance_multiplier_cost: number;
    overhead_cost: number;
    margin_amount: number;
  };
  margin_amount?: number;
  margin_pct?: number;
}
