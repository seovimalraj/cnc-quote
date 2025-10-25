-- Supplier capabilities and approvals schema

-- Table: supplier_capabilities
CREATE TABLE IF NOT EXISTS supplier_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  processes TEXT[] NOT NULL,
  materials TEXT[] NOT NULL DEFAULT '{}',
  machine_groups TEXT[] NOT NULL DEFAULT '{}',
  throughput_per_week INTEGER NOT NULL DEFAULT 0,
  lead_days INTEGER NOT NULL DEFAULT 0,
  certifications TEXT[] NOT NULL DEFAULT '{}',
  regions TEXT[] NOT NULL DEFAULT '{}',
  envelope JSONB,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_capabilities_org ON supplier_capabilities(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_capabilities_supplier ON supplier_capabilities(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_capabilities_active ON supplier_capabilities(active);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_supplier_capabilities_org_supplier'
  ) THEN
    CREATE UNIQUE INDEX uq_supplier_capabilities_org_supplier ON supplier_capabilities(org_id, supplier_id);
  END IF;
END $$;

-- Table: supplier_approvals
CREATE TABLE IF NOT EXISTS supplier_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  approved BOOLEAN NOT NULL,
  capacity_commitment INTEGER,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, supplier_id, quote_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_approvals_org ON supplier_approvals(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_approvals_supplier ON supplier_approvals(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_approvals_quote ON supplier_approvals(quote_id);

-- RLS enablement
ALTER TABLE supplier_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_approvals ENABLE ROW LEVEL SECURITY;

-- RLS: select restricted to org scope
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'supplier_capabilities' AND policyname = 'supplier_capabilities_select_org'
  ) THEN
    CREATE POLICY supplier_capabilities_select_org ON supplier_capabilities
      FOR SELECT USING (org_id::text = current_setting('request.jwt.claims', true)::jsonb->>'org_id');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'supplier_approvals' AND policyname = 'supplier_approvals_select_org'
  ) THEN
    CREATE POLICY supplier_approvals_select_org ON supplier_approvals
      FOR SELECT USING (org_id::text = current_setting('request.jwt.claims', true)::jsonb->>'org_id');
  END IF;
END $$;

-- NOTE: Write policies (INSERT/UPDATE/DELETE) are intentionally omitted to default to service_role bypass for now.
-- If supplier-user write access is required, add a policy similar to below once supplier_users mapping is clarified:
-- CREATE POLICY supplier_capabilities_write_supplier ON supplier_capabilities
--   FOR ALL USING (
--     org_id::text = current_setting('request.jwt.claims', true)::jsonb->>'org_id'
--   ) WITH CHECK (
--     org_id::text = current_setting('request.jwt.claims', true)::jsonb->>'org_id'
--   );

-- Trigger to maintain updated_at on supplier_capabilities
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplier_capabilities_updated_at ON supplier_capabilities;
CREATE TRIGGER trg_supplier_capabilities_updated_at
BEFORE UPDATE ON supplier_capabilities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
