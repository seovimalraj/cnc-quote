-- Step 16: Revision Timeline & Pricing Diffs
-- Enhance quote_revisions table with snapshot storage, diff computation, and event tracking

-- Add new columns to quote_revisions (created in Step 15)
ALTER TABLE quote_revisions 
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id),
  ADD COLUMN IF NOT EXISTS pricing_hash TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'user_update',
  ADD COLUMN IF NOT EXISTS restored_from_revision_id UUID REFERENCES quote_revisions(id);

-- Update existing rows to have org_id from their quote
UPDATE quote_revisions qr
SET org_id = q.org_id
FROM quotes q
WHERE qr.quote_id = q.id
  AND qr.org_id IS NULL;

-- Now make org_id NOT NULL
ALTER TABLE quote_revisions 
  ALTER COLUMN org_id SET NOT NULL;

-- Add check constraint for event_type
ALTER TABLE quote_revisions
  ADD CONSTRAINT check_event_type_valid 
  CHECK (event_type IN ('user_update', 'system_reprice', 'tax_update', 'restore', 'initial'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qrev_quote_time 
  ON quote_revisions(quote_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qrev_org_quote 
  ON quote_revisions(org_id, quote_id);

CREATE INDEX IF NOT EXISTS idx_qrev_event_type 
  ON quote_revisions(event_type);

CREATE INDEX IF NOT EXISTS idx_qrev_pricing_hash 
  ON quote_revisions(pricing_hash) 
  WHERE pricing_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qrev_created_at 
  ON quote_revisions(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN quote_revisions.snapshot_json IS 'Complete snapshot of quote state including inputs and computed outputs';
COMMENT ON COLUMN quote_revisions.diff_json IS 'Field-level changes and factor deltas compared to previous revision';
COMMENT ON COLUMN quote_revisions.event_type IS 'Type of event that triggered this revision: user_update, system_reprice, tax_update, restore, initial';
COMMENT ON COLUMN quote_revisions.pricing_hash IS 'Hash of pricing inputs for deduplication';
COMMENT ON COLUMN quote_revisions.restored_from_revision_id IS 'If this is a restore event, the revision ID that was restored';

-- Enable RLS
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for org isolation
DROP POLICY IF EXISTS quote_revisions_org_isolation ON quote_revisions;
CREATE POLICY quote_revisions_org_isolation ON quote_revisions
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Grant permissions
GRANT SELECT ON quote_revisions TO authenticated;
GRANT INSERT ON quote_revisions TO authenticated;
GRANT UPDATE(note) ON quote_revisions TO authenticated;

-- Create view for timeline items
CREATE OR REPLACE VIEW quote_revision_timeline AS
SELECT 
  qr.id,
  qr.quote_id,
  qr.org_id,
  qr.version,
  qr.event_type,
  qr.created_at,
  qr.created_by_user_id,
  qr.note,
  qr.total_delta,
  qr.pct_delta,
  qr.restored_from_revision_id,
  qr.pricing_hash,
  (qr.diff_json->>'summary')::jsonb as diff_summary,
  CASE 
    WHEN qr.created_at::date = CURRENT_DATE THEN 'today'
    WHEN qr.created_at::date = CURRENT_DATE - INTERVAL '1 day' THEN 'yesterday'
    WHEN qr.created_at > CURRENT_DATE - INTERVAL '7 days' THEN 'last_7_days'
    WHEN qr.created_at > CURRENT_DATE - INTERVAL '30 days' THEN 'last_30_days'
    ELSE 'older'
  END as time_group
FROM quote_revisions qr;

-- Helper functions
CREATE OR REPLACE FUNCTION get_quote_revision_count(p_quote_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM quote_revisions
  WHERE quote_id = p_quote_id;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_latest_revision(p_quote_id UUID)
RETURNS UUID AS $$
  SELECT id
  FROM quote_revisions
  WHERE quote_id = p_quote_id
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;
