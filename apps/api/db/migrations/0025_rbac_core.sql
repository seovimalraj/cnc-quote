-- RBAC Core Migration (org-scoped roles: admin, engineer, buyer)
-- Idempotent guards added where feasible

-- 1. Role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE role_enum AS ENUM ('admin','engineer','buyer');
  END IF;
END $$;

-- 2. Orgs table (avoid clash with existing organizations; reuse if present)
-- Prefer reusing existing public.organizations if schema matches; else create alias view
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='orgs'
  ) THEN
    CREATE TABLE IF NOT EXISTS orgs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- 3. Users base table (lightweight logical identity layer if not already existing)
-- If a users table already exists (0021 migration) we will not recreate; we extend via org_members.

-- 4. org_members mapping (separate from legacy organization_members to avoid disruption)
CREATE TABLE IF NOT EXISTS org_members (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role role_enum NOT NULL,
  invited_by uuid REFERENCES users(id),
  invited_at timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, org_id)
);

-- 5. audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  org_id uuid REFERENCES orgs(id),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  diff_json jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_org_time_idx ON audit_log(org_id, created_at DESC);

-- 6. Add org linkage columns where needed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='org_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN org_id uuid REFERENCES orgs(id);
  END IF;
END $$;

-- Optional supplier_profiles table alteration (guard)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='supplier_profiles' AND column_name='org_id'
    ) THEN
      ALTER TABLE supplier_profiles ADD COLUMN org_id uuid; -- null = global
    END IF;
  END IF;
END $$;

-- Optional material_properties table alteration (guard)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='material_properties') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='material_properties' AND column_name='managed_by_org'
    ) THEN
      ALTER TABLE material_properties ADD COLUMN managed_by_org uuid; -- null = global
    END IF;
  END IF;
END $$;

-- 7. Enable RLS & basic policies (detailed policies will be separate migration / configurable)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

-- Simple RLS allowing members to read their org & membership (full policies added later)
CREATE POLICY IF NOT EXISTS orgs_member_select ON orgs FOR SELECT USING (
  id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY IF NOT EXISTS org_members_member_select ON org_members FOR SELECT USING (
  user_id = auth.uid() OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY IF NOT EXISTS audit_log_member_select ON audit_log FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);

-- 8. Seed demo org/users if empty (non-destructive)
INSERT INTO orgs (id, name)
SELECT '00000000-0000-0000-0000-000000000001', 'Demo Org'
WHERE NOT EXISTS (SELECT 1 FROM orgs WHERE id='00000000-0000-0000-0000-000000000001');

-- NOTE: user IDs assumed pre-exist in users table; membership seeds are conditional
INSERT INTO org_members (user_id, org_id, role)
SELECT 'u-admin','00000000-0000-0000-0000-000000000001','admin'
WHERE NOT EXISTS (SELECT 1 FROM org_members WHERE user_id='u-admin' AND org_id='00000000-0000-0000-0000-000000000001');
INSERT INTO org_members (user_id, org_id, role)
SELECT 'u-eng','00000000-0000-0000-0000-000000000001','engineer'
WHERE NOT EXISTS (SELECT 1 FROM org_members WHERE user_id='u-eng' AND org_id='00000000-0000-0000-0000-000000000001');
INSERT INTO org_members (user_id, org_id, role)
SELECT 'u-buyer','00000000-0000-0000-0000-000000000001','buyer'
WHERE NOT EXISTS (SELECT 1 FROM org_members WHERE user_id='u-buyer' AND org_id='00000000-0000-0000-0000-000000000001');

-- End RBAC core migration