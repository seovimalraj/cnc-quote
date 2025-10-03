-- RBAC baseline migration

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE role_enum AS ENUM ('admin', 'engineer', 'buyer');
  END IF;
END $$;

-- Extend organization_members with RBAC metadata
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.users(id);
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT now();

-- Migrate legacy role column to role_enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'role_enum_migration_temp'
  ) THEN
    ALTER TABLE public.organization_members ADD COLUMN role_enum_migration_temp role_enum;
  END IF;
END $$;

UPDATE public.organization_members
SET role_enum_migration_temp = CASE
  WHEN role IN ('owner', 'admin') THEN 'admin'::role_enum
  WHEN role = 'engineer' THEN 'engineer'::role_enum
  ELSE 'buyer'::role_enum
END
WHERE role_enum_migration_temp IS DISTINCT FROM CASE
  WHEN role IN ('owner', 'admin') THEN 'admin'::role_enum
  WHEN role = 'engineer' THEN 'engineer'::role_enum
  ELSE 'buyer'::role_enum
END;

ALTER TABLE public.organization_members ALTER COLUMN role_enum_migration_temp SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_role_check') THEN
    ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_role_check;
  END IF;
END $$;

ALTER TABLE public.organization_members DROP COLUMN role;
ALTER TABLE public.organization_members RENAME COLUMN role_enum_migration_temp TO role;

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users(id),
  org_id uuid REFERENCES public.organizations(id),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  diff_json jsonb,
  metadata jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_org_time_idx ON public.audit_log(org_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS audit_log_read ON public.audit_log
  FOR SELECT USING (
    CASE
      WHEN current_setting('app.current_org', true) IS NULL THEN false
      ELSE org_id = current_setting('app.current_org', true)::uuid
    END
  );

-- Helper function to set per-request org context
CREATE OR REPLACE FUNCTION public.set_current_org(org uuid)
RETURNS void
AS $$
BEGIN
  PERFORM set_config('app.current_org', org::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_current_org(uuid) TO authenticated;

-- Optional per-org scoping columns
ALTER TABLE IF EXISTS public.material_properties
  ADD COLUMN IF NOT EXISTS managed_by_org uuid REFERENCES public.organizations(id);

ALTER TABLE IF EXISTS public.supplier_profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
