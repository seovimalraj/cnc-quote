UPDATE admin_pricing_revision_runs
SET org_id = '00000000-0000-0000-0000-000000000000'
WHERE org_id IS NULL;

ALTER TABLE admin_pricing_revision_runs
  ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS admin_pricing_revision_runs_org_idx
  ON admin_pricing_revision_runs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_ai_prompts_org_created_idx
  ON admin_ai_prompts (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_pricing_revision_approvals_org_idx
  ON admin_pricing_revision_approvals (org_id, created_at DESC);

DROP POLICY IF EXISTS "admin_pricing_revision_runs_tenant_read" ON admin_pricing_revision_runs;
CREATE POLICY "admin_pricing_revision_runs_tenant_read"
  ON admin_pricing_revision_runs
  FOR SELECT
  TO authenticated
  USING (
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'), '')::uuid = org_id
  );

DROP POLICY IF EXISTS "admin_ai_prompts_tenant_read" ON admin_ai_prompts;
CREATE POLICY "admin_ai_prompts_tenant_read"
  ON admin_ai_prompts
  FOR SELECT
  TO authenticated
  USING (
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'), '')::uuid = org_id
  );

DROP POLICY IF EXISTS "admin_pricing_revision_approvals_tenant_read" ON admin_pricing_revision_approvals;
CREATE POLICY "admin_pricing_revision_approvals_tenant_read"
  ON admin_pricing_revision_approvals
  FOR SELECT
  TO authenticated
  USING (
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'), '')::uuid = org_id
  );
