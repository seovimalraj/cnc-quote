/**
 * Step 15: Quote Expiration & Scheduled Reprice - Database Schema
 * 
 * Features:
 * - Quote expiration tracking with automatic status transitions
 * - Quote revisions for repricing with pricing diff storage
 * - Version tracking for pricing changes
 * - Status lifecycle management
 */

-- Add expiration and repricing fields to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS repriced_at TIMESTAMPTZ NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS pricing_version TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS reprice_job_id TEXT NULL;

-- Add status field (if not exists)
-- Status lifecycle: draft → active → expired|won|lost
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quotes' AND column_name = 'status') THEN
    ALTER TABLE quotes ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
  END IF;
END $$;

-- Create indexes for expiration queries
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at 
  ON quotes(expires_at) 
  WHERE status IN ('active');

CREATE INDEX IF NOT EXISTS idx_quotes_status 
  ON quotes(status);

CREATE INDEX IF NOT EXISTS idx_quotes_repriced_at 
  ON quotes(repriced_at) 
  WHERE status = 'expired';

-- Create quote_revisions table for pricing history and diffs
CREATE TABLE IF NOT EXISTS quote_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL,
  user_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  diff_json JSONB NOT NULL,
  note TEXT NULL,
  restore_of_revision_id UUID NULL,
  pricing_version_old TEXT NULL,
  pricing_version_new TEXT NULL,
  total_delta DECIMAL(12, 2) NULL,
  pct_delta DECIMAL(6, 4) NULL,
  
  CONSTRAINT fk_qr_quote 
    FOREIGN KEY (quote_id) 
    REFERENCES quotes(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_qr_restore 
    FOREIGN KEY (restore_of_revision_id) 
    REFERENCES quote_revisions(id) 
    ON DELETE SET NULL
);

-- Indexes for revisions
CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id 
  ON quote_revisions(quote_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_revisions_created 
  ON quote_revisions(created_at DESC);

-- Add constraints
ALTER TABLE quotes 
  ADD CONSTRAINT check_status_valid 
  CHECK (status IN ('draft', 'active', 'expired', 'won', 'lost'));

ALTER TABLE quotes 
  ADD CONSTRAINT check_expires_after_created 
  CHECK (expires_at IS NULL OR expires_at > created_at);

ALTER TABLE quote_revisions 
  ADD CONSTRAINT check_diff_json_not_empty 
  CHECK (jsonb_typeof(diff_json) = 'object');

-- Comments for documentation
COMMENT ON COLUMN quotes.expires_at IS 'Timestamp when quote becomes invalid and read-only';
COMMENT ON COLUMN quotes.repriced_at IS 'Timestamp of last reprice suggestion generation';
COMMENT ON COLUMN quotes.version IS 'Increments on each persisted pricing change';
COMMENT ON COLUMN quotes.status IS 'Lifecycle state: draft|active|expired|won|lost';
COMMENT ON COLUMN quotes.pricing_version IS 'Pricing engine/catalog version used for this quote';
COMMENT ON COLUMN quotes.reprice_job_id IS 'BullMQ job ID for tracking async reprice tasks';

COMMENT ON TABLE quote_revisions IS 'Pricing revision history with factor-level diffs';
COMMENT ON COLUMN quote_revisions.diff_json IS 'Pricing diff output comparing old vs new factors';
COMMENT ON COLUMN quote_revisions.note IS 'Short human note (e.g., Auto-reprice due to expiration)';
COMMENT ON COLUMN quote_revisions.restore_of_revision_id IS 'Links to revision being restored';

-- Audit log actions (add to audit_log enum if using enum type)
-- QUOTE_EXPIRED, QUOTE_REPRICED, QUOTE_EXPIRATION_EXTENDED
