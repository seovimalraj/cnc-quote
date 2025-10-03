-- Step 17: Marketplace v0 - Supplier Schema + Manual Routing
-- Migration: 0017_marketplace_v0

-- Create enum types
CREATE TYPE certification_enum AS ENUM (
  'ISO9001',
  'AS9100',
  'ITAR',
  'ISO13485',
  'IATF16949',
  'NONE'
);

CREATE TYPE process_enum AS ENUM (
  'CNC_MILLING',
  'CNC_TURNING',
  'SHEET_METAL',
  'INJECTION_MOLDING',
  'CASTING',
  'ADDITIVE',
  'URETHANE'
);

-- Supplier profiles table
CREATE TABLE supplier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  regions TEXT[] NOT NULL DEFAULT '{}',
  certifications certification_enum[] NOT NULL DEFAULT '{NONE}',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_supplier_name_length CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 200),
  CONSTRAINT chk_rating_range CHECK (rating >= 0.00 AND rating <= 5.00)
);

CREATE INDEX idx_supplier_profiles_org ON supplier_profiles(org_id);
CREATE INDEX idx_supplier_profiles_active ON supplier_profiles(org_id, active) WHERE active = TRUE;

-- Process capabilities table
CREATE TABLE process_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
  process process_enum NOT NULL,
  envelope_json JSONB NOT NULL,
  materials_json JSONB NOT NULL,
  finish_json JSONB DEFAULT '{}'::jsonb,
  min_qty INTEGER DEFAULT 1,
  max_qty INTEGER DEFAULT 1000000,
  leadtime_days_min INTEGER DEFAULT 3,
  leadtime_days_max INTEGER DEFAULT 30,
  unit_cost_index NUMERIC(8,4) DEFAULT 1.0000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_qty_range CHECK (min_qty > 0 AND max_qty >= min_qty),
  CONSTRAINT chk_leadtime_range CHECK (leadtime_days_min > 0 AND leadtime_days_max >= leadtime_days_min),
  CONSTRAINT chk_cost_index_range CHECK (unit_cost_index >= 0.2 AND unit_cost_index <= 5.0)
);

CREATE INDEX idx_proc_caps_supplier ON process_capabilities(supplier_id);
CREATE INDEX idx_proc_caps_process ON process_capabilities(process);

-- Routing rules table
CREATE TABLE routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  rule_json JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_rule_name_length CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 200)
);

CREATE INDEX idx_routing_rules_org_active ON routing_rules(org_id, active, priority);

-- Extend orders table with supplier linkage
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS supplier_id UUID NULL REFERENCES supplier_profiles(id),
  ADD COLUMN IF NOT EXISTS routing_notes TEXT,
  ADD COLUMN IF NOT EXISTS routed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS routed_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_routed_at ON orders(routed_at) WHERE routed_at IS NOT NULL;

-- Supplier files table (for NDAs, MSAs, certs)
CREATE TABLE supplier_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_file_kind CHECK (kind IN ('NDA', 'MSA', 'CERT', 'ISO', 'OTHER'))
);

CREATE INDEX idx_supplier_files_supplier ON supplier_files(supplier_id);
CREATE INDEX idx_supplier_files_kind ON supplier_files(supplier_id, kind);

-- RLS policies
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_profiles_org_isolation ON supplier_profiles
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

CREATE POLICY process_capabilities_org_isolation ON process_capabilities
  USING (
    supplier_id IN (
      SELECT id FROM supplier_profiles 
      WHERE org_id = current_setting('app.current_org_id', TRUE)::uuid
    )
  );

CREATE POLICY routing_rules_org_isolation ON routing_rules
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

CREATE POLICY supplier_files_org_isolation ON supplier_files
  USING (
    supplier_id IN (
      SELECT id FROM supplier_profiles 
      WHERE org_id = current_setting('app.current_org_id', TRUE)::uuid
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_profiles_updated_at
  BEFORE UPDATE ON supplier_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_capabilities_updated_at
  BEFORE UPDATE ON process_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE supplier_profiles IS 'Marketplace v0: Supplier directory with capabilities and certifications';
COMMENT ON TABLE process_capabilities IS 'Process-specific capabilities for each supplier (envelope, materials, lead times)';
COMMENT ON TABLE routing_rules IS 'Manual routing rules for order assignment (e.g., ITAR enforcement)';
COMMENT ON COLUMN orders.supplier_id IS 'Assigned supplier for this order (marketplace v0)';
COMMENT ON TABLE supplier_files IS 'Attached documents for suppliers (NDAs, MSAs, certifications)';
