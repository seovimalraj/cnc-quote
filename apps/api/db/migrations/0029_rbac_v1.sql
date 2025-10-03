-- RBAC v1 core schema
CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','engineer','buyer','viewer')),
  invited_by uuid,
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY(org_id, user_id)
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS default_org_id uuid REFERENCES orgs(id),
  ADD COLUMN IF NOT EXISTS last_org_id uuid REFERENCES orgs(id);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('allow','deny')),
  action text NOT NULL,
  resource text NOT NULL,
  condition_json jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS role_policies (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES policies(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, policy_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  before_json jsonb,
  after_json jsonb,
  ip inet,
  ua text,
  request_id text,
  trace_id text,
  path text,
  method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','engineer','buyer','viewer')),
  token text NOT NULL,
  invited_by uuid NOT NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS org_invites_token_idx ON org_invites(token);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id);
ALTER TABLE files ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id);
ALTER TABLE pricing_cache ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id);

CREATE INDEX IF NOT EXISTS quotes_org_idx ON quotes(org_id);
CREATE INDEX IF NOT EXISTS files_org_idx ON files(org_id);
CREATE INDEX IF NOT EXISTS audit_log_org_idx ON audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_log_trace_idx ON audit_log(trace_id);

CREATE TABLE IF NOT EXISTS audit_log_retention (
  org_id uuid PRIMARY KEY,
  days int NOT NULL DEFAULT 365
);

-- Seed base roles if not already present
INSERT INTO roles (name, description)
VALUES
  ('admin', 'Full org control'),
  ('engineer', 'Can price & DFM'),
  ('buyer', 'Create/approve quotes'),
  ('viewer', 'Read-only'),
  ('security_analyst', 'Audit log access and security monitoring')
ON CONFLICT (name) DO NOTHING;
