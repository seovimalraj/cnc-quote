-- RBAC RLS Policies Migration (using app.current_org session variable)
-- Assumes 0025_rbac_core.sql has been applied

-- Drop existing policies to avoid conflicts (idempotent)
DROP POLICY IF EXISTS quotes_read ON quotes;
DROP POLICY IF EXISTS quotes_write ON quotes;
DROP POLICY IF EXISTS audit_log_read ON audit_log;
DROP POLICY IF EXISTS orgs_member_select ON orgs;
DROP POLICY IF EXISTS org_members_member_select ON org_members;
DROP POLICY IF EXISTS audit_log_member_select ON audit_log;

-- Quotes RLS: org-scoped isolation
CREATE POLICY quotes_read ON quotes FOR SELECT USING (
  org_id::text = current_setting('app.current_org', true)
);
CREATE POLICY quotes_write ON quotes FOR ALL USING (
  org_id::text = current_setting('app.current_org', true)
);

-- Audit log RLS: org-scoped
CREATE POLICY audit_log_read ON audit_log FOR SELECT USING (
  org_id::text = current_setting('app.current_org', true)
);

-- Orgs RLS: members can see their orgs
CREATE POLICY orgs_member_select ON orgs FOR SELECT USING (
  id IN (SELECT org_id FROM org_members WHERE user_id = current_setting('app.user_id', true)::uuid)
);

-- Org members RLS: users can see their own membership + org members
CREATE POLICY org_members_member_select ON org_members FOR SELECT USING (
  user_id = current_setting('app.user_id', true)::uuid OR
  org_id IN (SELECT org_id FROM org_members WHERE user_id = current_setting('app.user_id', true)::uuid)
);

-- Note: Write policies for org_members and orgs will be added as needed (e.g., admin-only for invites)
-- For now, read-only for members; mutations via API layer with role checks.