-- Manual issue tracking for admin workcenter actions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS admin_manual_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  error_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_manual_issues_source_idx
  ON admin_manual_issues(source);

CREATE INDEX IF NOT EXISTS admin_manual_issues_error_idx
  ON admin_manual_issues(error_id);

ALTER TABLE admin_manual_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view manual issues"
  ON admin_manual_issues FOR SELECT
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

CREATE POLICY "Admins can manage manual issues"
  ON admin_manual_issues FOR ALL
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

INSERT INTO admin_manual_issues (issue_key, source, error_id, status, metadata)
VALUES
  ('ADM-1001', 'sentry', 'err_123', 'open', jsonb_build_object('note', 'Seed issue created for dashboard validation.'))
ON CONFLICT (issue_key) DO NOTHING;
