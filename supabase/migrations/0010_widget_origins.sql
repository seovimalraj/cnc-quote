-- Add widget origins table for CORS/CSP
CREATE TABLE widget_origins (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) NOT NULL,
  origin text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE widget_origins ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Widget origins are viewable by authenticated users of the same organization" ON widget_origins
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Widget origins are insertable by admins of the same organization" ON widget_origins
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Widget origins are updatable by admins of the same organization" ON widget_origins
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Widget origins are deletable by admins of the same organization" ON widget_origins
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add unique constraint per org
CREATE UNIQUE INDEX widget_origins_org_origin_idx ON widget_origins(org_id, origin);

-- Add index for quick lookups
CREATE INDEX widget_origins_active_idx ON widget_origins(active);
