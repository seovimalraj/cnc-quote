-- Admin pricing recalc run tracking tables

CREATE TABLE IF NOT EXISTS admin_pricing_recalc_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_by TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  dry_run BOOLEAN DEFAULT FALSE,
  version TEXT,
  scope_json JSONB,
  total_count INTEGER,
  success_count INTEGER,
  failed_count INTEGER,
  skipped_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recalc_runs_org ON admin_pricing_recalc_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_recalc_runs_status ON admin_pricing_recalc_runs(status);

CREATE TABLE IF NOT EXISTS admin_pricing_recalc_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES admin_pricing_recalc_runs(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  quote_item_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  delta_total NUMERIC(12,2),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recalc_items_run ON admin_pricing_recalc_items(run_id);
CREATE INDEX IF NOT EXISTS idx_recalc_items_org ON admin_pricing_recalc_items(org_id);
CREATE INDEX IF NOT EXISTS idx_recalc_items_quote ON admin_pricing_recalc_items(quote_id);

-- RLS: enable and restrict by org_id for both tables
ALTER TABLE admin_pricing_recalc_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_pricing_recalc_items ENABLE ROW LEVEL SECURITY;

-- Policies: org_members can select their org rows; writes restricted to service role
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_pricing_recalc_runs' AND policyname = 'recalc_runs_select_org'
  ) THEN
    CREATE POLICY recalc_runs_select_org ON admin_pricing_recalc_runs
      FOR SELECT USING (org_id::text = current_setting('request.jwt.claims', true)::jsonb->>'org_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_pricing_recalc_items' AND policyname = 'recalc_items_select_org'
  ) THEN
    CREATE POLICY recalc_items_select_org ON admin_pricing_recalc_items
      FOR SELECT USING (org_id::text = current_setting('request.jwt.claims', true)::jsonb->>'org_id');
  END IF;
END $$;

-- Service role write policies (assumes service role bypass RLS or use a dedicated role)
-- If using Supabase service_role that bypasses RLS, no additional write policies needed.
