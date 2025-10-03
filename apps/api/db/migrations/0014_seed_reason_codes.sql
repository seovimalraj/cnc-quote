-- Step 14: Seed Outcome Reason Codes
-- Migration: 0014_seed_reason_codes.sql
-- Purpose: Populate standardized reason codes for quote outcomes

BEGIN;

-- Create outcome_reason_codes lookup table
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

-- Seed standard reason codes
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

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_outcome_reason_codes_category ON outcome_reason_codes(category, sort);
CREATE INDEX IF NOT EXISTS idx_outcome_reason_codes_active ON outcome_reason_codes(active) WHERE active = TRUE;

COMMENT ON TABLE outcome_reason_codes IS 'Standardized reason codes for quote outcomes';
COMMENT ON COLUMN outcome_reason_codes.category IS 'Grouping: pricing, operations, market, scope, accepted, expired, rescinded, other';
COMMENT ON COLUMN outcome_reason_codes.sort IS 'Display sort order within category';

COMMIT;
