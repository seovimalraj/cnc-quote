-- Step 14: Quote Outcomes and Margins
-- Migration: 0014_quote_outcomes_and_margins.sql
-- Purpose: Add quote outcome tracking and margin persistence

BEGIN;

-- Create outcome status enum
CREATE TYPE quote_outcome_status AS ENUM ('accepted','rejected','expired','rescinded');

-- Create quote_outcomes table
CREATE TABLE IF NOT EXISTS quote_outcomes (
  quote_id UUID PRIMARY KEY REFERENCES quotes(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  status quote_outcome_status NOT NULL,
  reason_code TEXT NULL, -- e.g., 'price_high', 'leadtime_long', 'lost_to_competitor', 'scope_change', 'no_response'
  reason_notes TEXT NULL,
  amount NUMERIC(14,2) NULL, -- final booked amount (for accepted) or offered price (for rejected)
  decided_by UUID NOT NULL REFERENCES users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for org-level queries
CREATE INDEX IF NOT EXISTS idx_quote_outcomes_org_status ON quote_outcomes(org_id, status);
CREATE INDEX IF NOT EXISTS idx_quote_outcomes_decided_at ON quote_outcomes(decided_at DESC);

-- Add margin columns to quote_lines
ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS line_cost_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS margin_pct NUMERIC(6,3);

-- Add margin columns to quotes
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS gross_margin_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS gross_margin_pct NUMERIC(6,3);

-- Add comment documentation
COMMENT ON TABLE quote_outcomes IS 'Tracks quote outcomes (accepted/rejected/expired/rescinded) with reasons and amounts';
COMMENT ON COLUMN quote_outcomes.reason_code IS 'Standardized reason code from outcome_reason_codes lookup';
COMMENT ON COLUMN quote_outcomes.reason_notes IS 'Free-form notes explaining the outcome (max 2000 chars)';
COMMENT ON COLUMN quote_outcomes.amount IS 'Final booked amount for accepted quotes or offered price for rejected';
COMMENT ON COLUMN quote_outcomes.meta IS 'Additional metadata like competitor info, currency, etc.';

COMMENT ON COLUMN quote_lines.line_cost_breakdown IS 'JSON breakdown of cost factors: setup_time_cost, machine_time_cost, material_cost, finish_cost, risk_markup, tolerance_multiplier_cost, overhead_cost, margin_amount';
COMMENT ON COLUMN quote_lines.margin_amount IS 'Calculated margin: sell_price - total_cost';
COMMENT ON COLUMN quote_lines.margin_pct IS 'Margin percentage: margin_amount / sell_price';

COMMENT ON COLUMN quotes.gross_margin_amount IS 'Aggregated margin amount across all quote lines';
COMMENT ON COLUMN quotes.gross_margin_pct IS 'Aggregated margin percentage: gross_margin_amount / total';

COMMIT;
