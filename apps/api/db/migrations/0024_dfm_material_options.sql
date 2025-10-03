-- DFM material options catalog
CREATE TABLE dfm_material_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  is_metal boolean DEFAULT true,
  density_g_cm3 numeric,
  elastic_modulus_gpa numeric,
  hardness_hv numeric,
  max_operating_temp_c numeric,
  machinability_rating integer,
  notes text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE dfm_material_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DFM material options are publicly readable when published" ON dfm_material_options
  FOR SELECT USING (published = true);

CREATE POLICY "Admins can manage DFM material options" ON dfm_material_options
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE dfm_requests
  ADD COLUMN material_id uuid REFERENCES dfm_material_options(id),
  ADD COLUMN material_code text,
  ADD COLUMN material_name text;

CREATE INDEX idx_dfm_material_options_code ON dfm_material_options(code);
CREATE INDEX idx_dfm_material_options_category ON dfm_material_options(category);
CREATE INDEX idx_dfm_requests_material_id ON dfm_requests(material_id);

-- Seed common materials to bootstrap catalog
INSERT INTO dfm_material_options (
  code, name, description, category, is_metal,
  density_g_cm3, elastic_modulus_gpa, hardness_hv,
  max_operating_temp_c, machinability_rating, notes,
  published, published_at
) VALUES
  ('6061-T6', 'Aluminum 6061-T6', 'General-purpose aluminum alloy with excellent machinability and strength-to-weight ratio.', 'Aluminum', true,
   2.70, 69.0, 95, 150, 75, 'Go-to alloy for prototypes and housings.', true, now()),
  ('7075-T6', 'Aluminum 7075-T6', 'High-strength aerospace-grade aluminum; more demanding to machine.', 'Aluminum', true,
   2.81, 71.7, 150, 120, 55, 'Use when high strength is required; consider tool wear.', true, now()),
  ('304-SS', 'Stainless Steel 304', 'Austenitic stainless steel with good corrosion resistance.', 'Stainless Steel', true,
   8.00, 193.0, 150, 425, 45, 'Good general-purpose stainless; avoid for high-strength needs.', true, now()),
  ('17-4-PH', 'Stainless Steel 17-4 PH', 'Precipitation-hardened stainless offering high strength and hardness.', 'Stainless Steel', true,
   7.75, 200.0, 350, 315, 35, 'Requires rigid fixturing; consider stress relief after machining.', true, now()),
  ('4140-HT', 'Alloy Steel 4140 HT', 'Chromoly alloy steel supplied in the heat-treated condition.', 'Alloy Steel', true,
   7.85, 205.0, 285, 500, 40, 'Great for tooling and shafts; ensure proper coolant.', true, now()),
  ('PEEK-NT', 'PEEK (Natural)', 'High-performance thermoplastic with excellent chemical resistance.', 'Polymer', false,
   1.30, 3.6, NULL, 250, 60, 'Use sharp tools, high spindle speeds, and low feed per tooth.', true, now());
