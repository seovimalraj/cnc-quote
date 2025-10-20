ALTER TABLE admin_pricing_revision_runs
  ADD COLUMN approval_state TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN proposal_digest TEXT;

ALTER TABLE admin_pricing_revision_runs
  ADD CONSTRAINT admin_pricing_revision_runs_approval_state_chk
  CHECK (approval_state IN ('pending', 'approved', 'rejected', 'not_required'));

CREATE INDEX admin_pricing_revision_runs_digest_idx
  ON admin_pricing_revision_runs (proposal_digest);

UPDATE admin_pricing_revision_runs
SET
  approval_state = CASE
    WHEN status = 'succeeded' AND proposal_config IS NOT NULL THEN 'pending'
    ELSE 'not_required'
  END,
  approval_required = CASE
    WHEN status = 'succeeded' AND proposal_config IS NOT NULL THEN TRUE
    ELSE FALSE
  END;

CREATE TABLE admin_pricing_revision_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  run_id UUID NOT NULL REFERENCES admin_pricing_revision_runs(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  approved_by UUID NOT NULL,
  approved_by_email TEXT,
  approved_role TEXT,
  notes TEXT,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX admin_pricing_revision_approvals_unique
  ON admin_pricing_revision_approvals (run_id, approved_by);

CREATE INDEX admin_pricing_revision_approvals_org_idx
  ON admin_pricing_revision_approvals (org_id, created_at DESC);

CREATE INDEX admin_pricing_revision_approvals_run_idx
  ON admin_pricing_revision_approvals (run_id);

ALTER TABLE admin_pricing_revision_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_pricing_revision_approvals_service_only"
  ON admin_pricing_revision_approvals
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
