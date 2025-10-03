-- ============================================================================
-- RBAC & Audit Log Schema - ROLLBACK
-- Migration Rollback: 0023_rbac_audit_rollback.sql
-- Created: 2025-10-02
-- Purpose: Safely rollback RBAC implementation
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS org_members_audit_trigger ON org_members;

-- Drop trigger functions
DROP FUNCTION IF EXISTS audit_role_change();

-- Drop helper functions
DROP FUNCTION IF EXISTS log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_role(UUID, UUID);

-- Drop RLS policies
DROP POLICY IF EXISTS admin_bypass_audit_log ON audit_log;
DROP POLICY IF EXISTS admin_bypass_orders ON orders;
DROP POLICY IF EXISTS admin_bypass_quotes ON quotes;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;
DROP POLICY IF EXISTS org_isolation_audit_log ON audit_log;
DROP POLICY IF EXISTS org_isolation_pricing_cache ON pricing_cache;
DROP POLICY IF EXISTS org_isolation_orders ON orders;
DROP POLICY IF EXISTS org_isolation_quotes ON quotes;
DROP POLICY IF EXISTS org_isolation_members ON org_members;
DROP POLICY IF EXISTS org_isolation_organizations ON organizations;

-- Disable RLS
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop indexes
DROP INDEX IF EXISTS idx_pricing_cache_org_id;
DROP INDEX IF EXISTS idx_orders_org_id;
DROP INDEX IF EXISTS idx_quotes_org_id;
DROP INDEX IF EXISTS idx_audit_log_org_created;
DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_resource;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS idx_audit_log_org_id;
DROP INDEX IF EXISTS idx_role_policies_role_id;
DROP INDEX IF EXISTS idx_policies_action_resource;
DROP INDEX IF EXISTS idx_org_members_role;
DROP INDEX IF EXISTS idx_org_members_org_id;
DROP INDEX IF EXISTS idx_org_members_user_id;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS role_policies CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;

-- Note: Not dropping organizations table as it may be used elsewhere
-- and may contain critical data

-- Remove org_id columns from existing tables (optional - commented out for safety)
-- Uncomment only if you're certain these columns were added by this migration
-- ALTER TABLE quotes DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE pricing_cache DROP COLUMN IF EXISTS org_id;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ RBAC rollback complete';
  RAISE NOTICE '   - Dropped audit_log table';
  RAISE NOTICE '   - Dropped role_policies, policies, roles tables';
  RAISE NOTICE '   - Dropped org_members table';
  RAISE NOTICE '   - Disabled RLS policies';
  RAISE NOTICE '   - Dropped triggers and functions';
  RAISE NOTICE '⚠️  Note: organizations table and org_id columns retained for safety';
END $$;
