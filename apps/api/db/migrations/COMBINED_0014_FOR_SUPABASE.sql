-- Step 14: Combined Migration for Supabase
-- Combines outcomes, margins, and reason codes for Supabase SQL Editor

-- ============================================
-- PART 1: Quote Outcomes and Margins Tables
-- ============================================

-- Create outcome status enum
DO $$ BEGIN
  CREATE TYPE quote_outcome_status AS ENUM ('accepted','rejected','expired','rescinded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create quote_outcomes table
CREATE TABLE IF NOT EXISTS quote_outcomes (
  quote_id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  status quote_outcome_status NOT NULL,
  reason_code TEXT NULL,
  reason_notes TEXT NULL,
  amount NUMERIC(14,2) NULL,
  decided_by UUID NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
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

-- ============================================
-- PART 2: Outcome Reason Codes Lookup
-- ============================================

CREATE TABLE IF NOT EXISTS outcome_reason_codes (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data
INSERT INTO outcome_reason_codes(code, label, category, description, sort) VALUES
  ('price_high', 'Price too high', 'pricing', 'Customer found our pricing too expensive', 10),
  ('price_competitive', 'Price competitive but lost anyway', 'pricing', 'Pricing was in range but other factors lost the deal', 15),
  ('leadtime_long', 'Lead time too long', 'operations', 'Customer needed faster turnaround than we could offer', 20),
  ('capacity_issue', 'Capacity constraints', 'operations', 'Could not meet production schedule', 25),
  ('lost_to_competitor', 'Lost to competitor', 'market', 'Customer chose a competitor', 30),
  ('lost_to_incumbent', 'Lost to incumbent supplier', 'market', 'Customer stayed with existing supplier', 35),
  ('scope_change', 'Scope changed', 'scope', 'Project requirements or scope changed', 40),
  ('scope_cancel', 'Project cancelled', 'scope', 'Customer cancelled the entire project', 45),
  ('no_response', 'Customer unresponsive', 'other', 'Customer stopped responding to follow-ups', 50),
  ('budget_cut', 'Budget cut', 'other', 'Customer ran out of budget', 55),
  ('quality_concern', 'Quality concerns', 'other', 'Customer had concerns about quality or certifications', 60),
  ('accepted_standard', 'Accepted - standard terms', 'accepted', 'Quote accepted with standard payment terms', 70),
  ('accepted_negotiated', 'Accepted - negotiated terms', 'accepted', 'Quote accepted after price/terms negotiation', 75),
  ('expired_no_follow', 'Expired - no follow-up', 'expired', 'Quote expired without customer follow-up', 80),
  ('rescinded_by_us', 'Rescinded by us', 'rescinded', 'We withdrew the quote', 90),
  ('rescinded_error', 'Rescinded - pricing error', 'rescinded', 'Quote withdrawn due to pricing calculation error', 95)
ON CONFLICT (code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outcome_reason_codes_category ON outcome_reason_codes(category, sort);
CREATE INDEX IF NOT EXISTS idx_outcome_reason_codes_active ON outcome_reason_codes(active) WHERE active = TRUE;

-- ============================================
-- PART 3: Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE quote_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_reason_codes ENABLE ROW LEVEL SECURITY;

-- Policies for quote_outcomes (org-scoped)
CREATE POLICY "Users can view outcomes in their org"
  ON quote_outcomes FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY "Users can insert outcomes in their org"
  ON quote_outcomes FOR INSERT
  WITH CHECK (org_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY "Users can update outcomes in their org"
  ON quote_outcomes FOR UPDATE
  USING (org_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY "Users can delete outcomes in their org"
  ON quote_outcomes FOR DELETE
  USING (org_id = auth.jwt() ->> 'org_id'::text);

-- Policies for outcome_reason_codes (read-only for all authenticated users)
CREATE POLICY "All users can view reason codes"
  ON outcome_reason_codes FOR SELECT
  USING (active = TRUE);

-- ============================================
-- PART 4: Comments
-- ============================================

COMMENT ON TABLE quote_outcomes IS 'Tracks quote outcomes (accepted/rejected/expired/rescinded) with reasons and amounts';
COMMENT ON TABLE outcome_reason_codes IS 'Standardized reason codes for quote outcomes';
