-- Admin pricing revision assistant runs
CREATE TYPE admin_pricing_revision_status AS ENUM ('queued', 'processing', 'succeeded', 'failed');

CREATE TABLE admin_pricing_revision_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status admin_pricing_revision_status NOT NULL DEFAULT 'queued',
  instructions TEXT NOT NULL,
  focus_areas TEXT[] NULL,
  base_version TEXT NOT NULL,
  base_config JSONB NOT NULL,
  proposal_config JSONB,
  adjustments JSONB,
  diff_summary JSONB,
  notes TEXT,
  error_message TEXT,
  feature_flag_key TEXT NOT NULL DEFAULT 'admin_pricing_revision_assistant',
  requested_by UUID,
  requested_by_email TEXT,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX admin_pricing_revision_runs_status_idx ON admin_pricing_revision_runs(status);
CREATE INDEX admin_pricing_revision_runs_created_at_idx ON admin_pricing_revision_runs(created_at DESC);

ALTER TABLE admin_pricing_revision_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_pricing_revision_runs_service_only"
  ON admin_pricing_revision_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION set_admin_pricing_revision_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admin_pricing_revision_runs_updated_at
BEFORE UPDATE ON admin_pricing_revision_runs
FOR EACH ROW
EXECUTE FUNCTION set_admin_pricing_revision_runs_updated_at();
