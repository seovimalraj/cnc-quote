-- Add admin policies for DFM options management
-- Allow admins to manage DFM options

-- Admin policies for DFM tolerance options
CREATE POLICY "Admins can manage DFM tolerance options" ON dfm_tolerance_options
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for DFM finish options
CREATE POLICY "Admins can manage DFM finish options" ON dfm_finish_options
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for DFM industry options
CREATE POLICY "Admins can manage DFM industry options" ON dfm_industry_options
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for DFM certification options
CREATE POLICY "Admins can manage DFM certification options" ON dfm_certification_options
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for DFM criticality options
CREATE POLICY "Admins can manage DFM criticality options" ON dfm_criticality_options
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for DFM requests (for inbox functionality)
CREATE POLICY "Admins can view all DFM requests in their org" ON dfm_requests
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin policies for DFM results
CREATE POLICY "Admins can view all DFM results in their org" ON dfm_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    request_id IN (
      SELECT id FROM dfm_requests WHERE organization_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Add published_at timestamp for tracking when options were published
ALTER TABLE dfm_tolerance_options ADD COLUMN published_at timestamptz;
ALTER TABLE dfm_finish_options ADD COLUMN published_at timestamptz;
ALTER TABLE dfm_industry_options ADD COLUMN published_at timestamptz;
ALTER TABLE dfm_certification_options ADD COLUMN published_at timestamptz;
ALTER TABLE dfm_criticality_options ADD COLUMN published_at timestamptz;

-- Add versioning to DFM rules
ALTER TABLE dfm_rules ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE dfm_rules ADD COLUMN published_at timestamptz;
ALTER TABLE dfm_rules ADD COLUMN published_version integer;

-- Create audit log table for admin actions
CREATE TABLE dfm_admin_audit_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_user_id uuid REFERENCES auth.users(id) NOT NULL,
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE dfm_admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Admins can view audit logs for their org" ON dfm_admin_audit_log
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs" ON dfm_admin_audit_log
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_dfm_admin_audit_log_org_action ON dfm_admin_audit_log(organization_id, action);
CREATE INDEX idx_dfm_admin_audit_log_created_at ON dfm_admin_audit_log(created_at);
