-- =====================================================
-- Step 16: Revision Timeline + Pricing Diffs UI
-- Migration: Enhance quote_revisions for full lineage
-- =====================================================

-- Add new columns to quote_revisions (created in Step 15)
ALTER TABLE quote_revisions 
  ADD COLUMN IF NOT EXISTS org_id UUID NOT NULL REFERENCES orgs(id),
  ADD COLUMN IF NOT EXISTS pricing_hash TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'user_update',
  ADD COLUMN IF NOT EXISTS restored_from_revision_id UUID REFERENCES quote_revisions(id);

-- Drop old columns if they exist (Step 15 used diff_json differently)
ALTER TABLE quote_revisions 
  DROP COLUMN IF EXISTS restore_of_revision_id,
  DROP COLUMN IF EXISTS created_by_user_id;

-- Rename user column for consistency
ALTER TABLE quote_revisions 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add constraint for event_type enum
ALTER TABLE quote_revisions 
  ADD CONSTRAINT check_event_type_valid 
  CHECK (event_type IN ('user_update', 'system_reprice', 'tax_update', 'restore'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_qrev_quote_time 
  ON quote_revisions(quote_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qrev_org_quote 
  ON quote_revisions(org_id, quote_id);

CREATE INDEX IF NOT EXISTS idx_qrev_event_type 
  ON quote_revisions(event_type);

CREATE INDEX IF NOT EXISTS idx_qrev_pricing_hash 
  ON quote_revisions(pricing_hash) WHERE pricing_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qrev_restored_from 
  ON quote_revisions(restored_from_revision_id) WHERE restored_from_revision_id IS NOT NULL;

-- RLS policy for org isolation
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_revisions_org_isolation ON quote_revisions;

CREATE POLICY quote_revisions_org_isolation ON quote_revisions
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Function to auto-set org_id from parent quote
CREATE OR REPLACE FUNCTION set_revision_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id 
    FROM quotes 
    WHERE id = NEW.quote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_revision_org_id ON quote_revisions;

CREATE TRIGGER trg_set_revision_org_id
  BEFORE INSERT ON quote_revisions
  FOR EACH ROW
  EXECUTE FUNCTION set_revision_org_id();

-- Comment on columns
COMMENT ON COLUMN quote_revisions.snapshot_json IS 'Complete quote state: header, config, lines with inputs+outputs';
COMMENT ON COLUMN quote_revisions.diff_json IS 'Computed diff from prior revision: summary, by_factor, fields, lines';
COMMENT ON COLUMN quote_revisions.event_type IS 'Trigger: user_update, system_reprice, tax_update, restore';
COMMENT ON COLUMN quote_revisions.pricing_hash IS 'Same hash used in pricing cache for idempotency';
COMMENT ON COLUMN quote_revisions.restored_from_revision_id IS 'If event_type=restore, which revision was restored';

-- Migration complete
