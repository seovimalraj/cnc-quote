-- DFM (Design for Manufacturability) tables
CREATE TABLE dfm_tolerance_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dfm_finish_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dfm_industry_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dfm_certification_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dfm_criticality_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  value text NOT NULL,
  description text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dfm_files (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text,
  organization_id uuid REFERENCES organizations(id),
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dfm_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES auth.users(id),
  file_id uuid REFERENCES dfm_files(id) NOT NULL,
  file_name text NOT NULL,
  tolerance_pack text NOT NULL,
  surface_finish text NOT NULL,
  industry text NOT NULL,
  certifications text[] DEFAULT '{}',
  criticality text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Analyzing', 'Complete', 'Error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dfm_results (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id uuid REFERENCES dfm_requests(id) NOT NULL,
  checks jsonb NOT NULL DEFAULT '[]',
  summary jsonb NOT NULL DEFAULT '{}',
  viewer_mesh_id text,
  report_pdf_id text,
  qap_pdf_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE dfm_tolerance_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfm_finish_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfm_industry_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfm_certification_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfm_criticality_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfm_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfm_results ENABLE ROW LEVEL SECURITY;

-- Public read access for published options
CREATE POLICY "DFM tolerance options are publicly readable when published" ON dfm_tolerance_options
  FOR SELECT USING (published = true);

CREATE POLICY "DFM finish options are publicly readable when published" ON dfm_finish_options
  FOR SELECT USING (published = true);

CREATE POLICY "DFM industry options are publicly readable when published" ON dfm_industry_options
  FOR SELECT USING (published = true);

CREATE POLICY "DFM certification options are publicly readable when published" ON dfm_certification_options
  FOR SELECT USING (published = true);

CREATE POLICY "DFM criticality options are publicly readable when published" ON dfm_criticality_options
  FOR SELECT USING (published = true);

-- File access policies
CREATE POLICY "DFM files are viewable by authenticated users of the same organization" ON dfm_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "DFM files are insertable by authenticated users" ON dfm_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Request access policies
CREATE POLICY "DFM requests are viewable by authenticated users of the same organization" ON dfm_requests
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "DFM requests are insertable by authenticated users" ON dfm_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Results access policies
CREATE POLICY "DFM results are viewable by authenticated users of the same organization" ON dfm_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    request_id IN (
      SELECT id FROM dfm_requests WHERE organization_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes for performance
CREATE INDEX idx_dfm_requests_file_id ON dfm_requests(file_id);
CREATE INDEX idx_dfm_requests_organization_id ON dfm_requests(organization_id);
CREATE INDEX idx_dfm_requests_status ON dfm_requests(status);
CREATE INDEX idx_dfm_results_request_id ON dfm_results(request_id);

-- Insert some default options
INSERT INTO dfm_tolerance_options (name, description, published) VALUES
  ('Standard (±0.005")', 'Standard machining tolerances', true),
  ('Precision (±0.002")', 'High precision tolerances', true),
  ('Ultra Precision (±0.001")', 'Ultra high precision tolerances', true);

INSERT INTO dfm_finish_options (name, description, published) VALUES
  ('As Machined', 'Standard machined finish', true),
  ('Bead Blast', 'Bead blasted surface finish', true),
  ('Anodized', 'Anodized aluminum finish', true),
  ('Powder Coat', 'Powder coated finish', true);

INSERT INTO dfm_industry_options (name, description, published) VALUES
  ('Aerospace', 'Aerospace and aviation industry', true),
  ('Automotive', 'Automotive manufacturing', true),
  ('Medical', 'Medical devices and equipment', true),
  ('Consumer Electronics', 'Consumer electronics products', true),
  ('Industrial Equipment', 'Industrial machinery and equipment', true);

INSERT INTO dfm_certification_options (name, description, published) VALUES
  ('ISO 9001', 'Quality management systems', true),
  ('AS9100', 'Aerospace quality management', true),
  ('ISO 13485', 'Medical devices quality management', true),
  ('IATF 16949', 'Automotive quality management', true);

INSERT INTO dfm_criticality_options (name, value, description, published) VALUES
  ('Low', 'low', 'Non-critical component', true),
  ('Medium', 'medium', 'Standard criticality component', true),
  ('High', 'high', 'High criticality component', true),
  ('Critical', 'critical', 'Mission critical component', true);
