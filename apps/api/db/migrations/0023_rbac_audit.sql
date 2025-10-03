-- ============================================================================
-- RBAC & Audit Log Schema
-- Migration: 0023_rbac_audit.sql
-- Created: 2025-10-02
-- Purpose: Implement production-grade RBAC with audit logging
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ORGANIZATIONS & MEMBERS
-- ============================================================================

-- Organizations table (create if not exists)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members table (new structure for RBAC)
CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'org_admin', 'reviewer', 'finance', 'auditor')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_role_change_at TIMESTAMPTZ,
  PRIMARY KEY (org_id, user_id)
);

-- Indexes for org_members
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON org_members(role);

-- ============================================================================
-- 2. ROLES & POLICIES
-- ============================================================================

-- Roles catalog table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('buyer', 'org_admin', 'reviewer', 'finance', 'auditor', 'admin', 'partner')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  action TEXT NOT NULL, -- 'create', 'view', 'update', 'delete', 'approve', 'override'
  resource TEXT NOT NULL, -- 'quotes', 'orders', 'users', 'materials', 'payments', etc.
  condition_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role-Policy mapping
CREATE TABLE IF NOT EXISTS role_policies (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, policy_id)
);

-- Indexes for policies
CREATE INDEX IF NOT EXISTS idx_policies_action_resource ON policies(action, resource);
CREATE INDEX IF NOT EXISTS idx_role_policies_role_id ON role_policies(role_id);

-- ============================================================================
-- 3. AUDIT LOG
-- ============================================================================

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'user.role_changed', 'quote.approved', 'order.shipped', etc.
  resource_type TEXT NOT NULL, -- 'user', 'quote', 'order', etc.
  resource_id UUID,
  before_json JSONB,
  after_json JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit log (optimized for time-series queries)
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON audit_log(org_id, created_at DESC);

-- ============================================================================
-- 4. ADD ORG_ID TO EXISTING TABLES
-- ============================================================================

-- Add org_id column to existing tables if not present
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE pricing_cache ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Create indexes for org_id foreign keys
CREATE INDEX IF NOT EXISTS idx_quotes_org_id ON quotes(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_pricing_cache_org_id ON pricing_cache(org_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all multi-tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only access their own org
CREATE POLICY org_isolation_organizations ON organizations
  FOR ALL USING (
    id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Org Members: Users can only view members in their org
CREATE POLICY org_isolation_members ON org_members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Quotes: Users can only access quotes in their org
CREATE POLICY org_isolation_quotes ON quotes
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Orders: Users can only access orders in their org
CREATE POLICY org_isolation_orders ON orders
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Pricing Cache: Users can only access cache in their org
CREATE POLICY org_isolation_pricing_cache ON pricing_cache
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Audit Log: Users can only view audit logs for their org
CREATE POLICY org_isolation_audit_log ON audit_log
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Audit Log: System can insert audit logs
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (true);

-- Admin bypass policies (service role only)
CREATE POLICY admin_bypass_quotes ON quotes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY admin_bypass_orders ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY admin_bypass_audit_log ON audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. SEED DATA: ROLES & POLICIES
-- ============================================================================

-- Seed default roles
INSERT INTO roles (name, description) VALUES
  ('buyer', 'Can create quotes and place orders'),
  ('org_admin', 'Can manage organization, invite users, override pricing'),
  ('reviewer', 'Can review and approve quotes'),
  ('finance', 'Can manage payments and view financial data'),
  ('auditor', 'Read-only access to audit logs'),
  ('admin', 'Platform administrator with full access'),
  ('partner', 'Supplier partner with limited access')
ON CONFLICT (name) DO NOTHING;

-- Seed default policies
INSERT INTO policies (name, effect, action, resource) VALUES
  -- Buyer policies
  ('buyer_create_quote', 'allow', 'create', 'quotes'),
  ('buyer_view_quote', 'allow', 'view', 'quotes'),
  ('buyer_update_quote', 'allow', 'update', 'quotes'),
  ('buyer_view_dfm', 'allow', 'view', 'dfm'),
  ('buyer_view_pricing', 'allow', 'view', 'pricing'),
  ('buyer_create_order', 'allow', 'create', 'orders'),
  ('buyer_view_order', 'allow', 'view', 'orders'),
  
  -- Org Admin policies
  ('org_admin_all_quotes', 'allow', '*', 'quotes'),
  ('org_admin_all_orders', 'allow', '*', 'orders'),
  ('org_admin_invite_user', 'allow', 'invite', 'users'),
  ('org_admin_change_role', 'allow', 'change_role', 'users'),
  ('org_admin_override_pricing', 'allow', 'override', 'pricing'),
  ('org_admin_override_dfm', 'allow', 'override', 'dfm'),
  ('org_admin_view_payments', 'allow', 'view', 'payments'),
  ('org_admin_refund', 'allow', 'refund', 'payments'),
  ('org_admin_edit_catalog', 'allow', 'edit', 'catalog'),
  ('org_admin_view_health', 'allow', 'view', 'system'),
  
  -- Reviewer policies
  ('reviewer_view_quote', 'allow', 'view', 'quotes'),
  ('reviewer_edit_quote', 'allow', 'edit', 'quotes'),
  ('reviewer_override_dfm', 'allow', 'override', 'dfm'),
  ('reviewer_view_pricing', 'allow', 'view', 'pricing'),
  ('reviewer_view_order', 'allow', 'view', 'orders'),
  ('reviewer_progress_order', 'allow', 'progress', 'orders'),
  ('reviewer_view_catalog', 'allow', 'view', 'catalog'),
  
  -- Finance policies
  ('finance_view_payments', 'allow', 'view', 'payments'),
  ('finance_create_payment', 'allow', 'create', 'payments'),
  ('finance_refund', 'allow', 'refund', 'payments'),
  ('finance_override_pricing', 'allow', 'override', 'pricing'),
  ('finance_view_catalog', 'allow', 'view', 'catalog'),
  ('finance_edit_catalog', 'allow', 'edit', 'catalog'),
  
  -- Auditor policies
  ('auditor_view_audit', 'allow', 'view', 'audit_log'),
  ('auditor_view_quotes', 'allow', 'view', 'quotes'),
  ('auditor_view_orders', 'allow', 'view', 'orders'),
  
  -- Admin policies (wildcard)
  ('admin_all', 'allow', '*', '*')
ON CONFLICT (name) DO NOTHING;

-- Map roles to policies
DO $$
DECLARE
  buyer_role_id UUID;
  org_admin_role_id UUID;
  reviewer_role_id UUID;
  finance_role_id UUID;
  auditor_role_id UUID;
  admin_role_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO buyer_role_id FROM roles WHERE name = 'buyer';
  SELECT id INTO org_admin_role_id FROM roles WHERE name = 'org_admin';
  SELECT id INTO reviewer_role_id FROM roles WHERE name = 'reviewer';
  SELECT id INTO finance_role_id FROM roles WHERE name = 'finance';
  SELECT id INTO auditor_role_id FROM roles WHERE name = 'auditor';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  -- Buyer role policies
  INSERT INTO role_policies (role_id, policy_id)
  SELECT buyer_role_id, id FROM policies WHERE name IN (
    'buyer_create_quote', 'buyer_view_quote', 'buyer_update_quote',
    'buyer_view_dfm', 'buyer_view_pricing', 'buyer_create_order', 'buyer_view_order'
  ) ON CONFLICT DO NOTHING;
  
  -- Org Admin role policies
  INSERT INTO role_policies (role_id, policy_id)
  SELECT org_admin_role_id, id FROM policies WHERE name LIKE 'org_admin_%'
  ON CONFLICT DO NOTHING;
  
  -- Reviewer role policies
  INSERT INTO role_policies (role_id, policy_id)
  SELECT reviewer_role_id, id FROM policies WHERE name LIKE 'reviewer_%'
  ON CONFLICT DO NOTHING;
  
  -- Finance role policies
  INSERT INTO role_policies (role_id, policy_id)
  SELECT finance_role_id, id FROM policies WHERE name LIKE 'finance_%'
  ON CONFLICT DO NOTHING;
  
  -- Auditor role policies
  INSERT INTO role_policies (role_id, policy_id)
  SELECT auditor_role_id, id FROM policies WHERE name LIKE 'auditor_%'
  ON CONFLICT DO NOTHING;
  
  -- Admin role policies (all policies)
  INSERT INTO role_policies (role_id, policy_id)
  SELECT admin_role_id, id FROM policies WHERE name = 'admin_all'
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to log audit events (called from application code)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_org_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_before_json JSONB DEFAULT NULL,
  p_after_json JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,
  p_trace_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    org_id, user_id, action, resource_type, resource_id,
    before_json, after_json, ip_address, user_agent, request_id, trace_id
  ) VALUES (
    p_org_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_before_json, p_after_json, p_ip_address, p_user_agent, p_request_id, p_trace_id
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_org_id UUID) 
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM org_members
  WHERE user_id = p_user_id AND org_id = p_org_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS FOR AUTO-AUDIT
-- ============================================================================

-- Trigger function to auto-audit role changes
CREATE OR REPLACE FUNCTION audit_role_change() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role <> NEW.role THEN
    PERFORM log_audit_event(
      NEW.org_id,
      NEW.user_id,
      'user.role_changed',
      'user',
      NEW.user_id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
    
    NEW.last_role_change_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on org_members
DROP TRIGGER IF EXISTS org_members_audit_trigger ON org_members;
CREATE TRIGGER org_members_audit_trigger
  AFTER UPDATE ON org_members
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_change();

-- ============================================================================
-- 9. COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations';
COMMENT ON TABLE org_members IS 'Organization membership with roles';
COMMENT ON TABLE roles IS 'Available roles in the system';
COMMENT ON TABLE policies IS 'Fine-grained access control policies';
COMMENT ON TABLE role_policies IS 'Maps roles to their allowed policies';
COMMENT ON TABLE audit_log IS 'Audit trail for all privileged operations';
COMMENT ON FUNCTION log_audit_event IS 'Helper function to insert audit log entries';
COMMENT ON FUNCTION get_user_role IS 'Get user role in specific organization';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ RBAC migration 0023 complete';
  RAISE NOTICE '   - Created % roles', (SELECT COUNT(*) FROM roles);
  RAISE NOTICE '   - Created % policies', (SELECT COUNT(*) FROM policies);
  RAISE NOTICE '   - RLS enabled on 6 tables';
  RAISE NOTICE '   - Audit logging ready';
END $$;
