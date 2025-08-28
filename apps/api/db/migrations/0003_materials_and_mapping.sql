-- Create enum for material categories
CREATE TYPE material_category AS ENUM ('metal', 'plastic', 'composite');

-- Create materials table
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category material_category NOT NULL,
  density DECIMAL(10,4), -- g/cm³
  cost_per_kg DECIMAL(10,2),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Material costing table (e.g. volume-based, weight-based, area-based)
CREATE TABLE material_costing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  costing_type TEXT NOT NULL, -- volume, weight, area
  min_quantity DECIMAL(10,2),
  max_quantity DECIMAL(10,2),
  unit_cost DECIMAL(10,2),
  setup_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Post-processing options
CREATE TABLE post_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_cost DECIMAL(10,2),
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  lead_time_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Custom option groups (e.g. "Surface Finish", "Thread Type")
CREATE TABLE custom_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Custom options within groups
CREATE TABLE custom_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES custom_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  lead_time_hours INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Machine to Material mapping with overrides
CREATE TABLE machine_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  min_wall_thickness DECIMAL(10,2), -- mm
  max_wall_thickness DECIMAL(10,2), -- mm
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  setup_time_minutes INTEGER,
  allowed_post_processing UUID[] DEFAULT ARRAY[]::UUID[], -- References post_processing.id
  allowed_option_groups UUID[] DEFAULT ARRAY[]::UUID[], -- References custom_option_groups.id
  overrides_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, material_id)
);

-- Add RLS policies
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_costing ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for materials
CREATE POLICY "Materials are viewable by org members" ON materials
  FOR SELECT USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Materials are insertable by org members" ON materials
  FOR INSERT WITH CHECK (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Materials are updatable by org members" ON materials
  FOR UPDATE USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Materials are deletable by org members" ON materials
  FOR DELETE USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

-- Similar RLS policies for other tables
CREATE POLICY "Material costing viewable through material" ON material_costing
  FOR SELECT USING (material_id IN (
    SELECT id FROM materials WHERE org_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Post-processing options viewable by org members" ON post_processing
  FOR ALL USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Custom option groups viewable by org members" ON custom_option_groups
  FOR ALL USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Custom options viewable through groups" ON custom_options
  FOR SELECT USING (group_id IN (
    SELECT id FROM custom_option_groups WHERE org_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Machine materials viewable through machine or material" ON machine_materials
  FOR SELECT USING (
    machine_id IN (
      SELECT id FROM machines WHERE organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    ) OR
    material_id IN (
      SELECT id FROM materials WHERE org_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- Add indexes
CREATE INDEX materials_org_id_idx ON materials(org_id);
CREATE INDEX material_costing_material_id_idx ON material_costing(material_id);
CREATE INDEX post_processing_org_id_idx ON post_processing(org_id);
CREATE INDEX custom_option_groups_org_id_idx ON custom_option_groups(org_id);
CREATE INDEX custom_options_group_id_idx ON custom_options(group_id);
CREATE INDEX machine_materials_machine_id_idx ON machine_materials(machine_id);
CREATE INDEX machine_materials_material_id_idx ON machine_materials(material_id);

-- Sample data
INSERT INTO materials (org_id, name, category, density, cost_per_kg) VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Aluminum 6061', 'metal', 2.7, 12.50),
  ((SELECT id FROM organizations LIMIT 1), 'Stainless Steel 304', 'metal', 8.0, 25.00),
  ((SELECT id FROM organizations LIMIT 1), 'ABS', 'plastic', 1.04, 8.00);

INSERT INTO post_processing (org_id, name, description, base_cost, cost_multiplier, lead_time_hours) VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Anodizing', 'Type II anodizing for aluminum', 50.00, 1.2, 48),
  ((SELECT id FROM organizations LIMIT 1), 'Passivation', 'Chemical passivation for stainless steel', 75.00, 1.1, 24);

INSERT INTO custom_option_groups (org_id, name, description, is_required) VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Surface Finish', 'Final surface treatment', true);

INSERT INTO custom_options (group_id, name, description, cost_multiplier, lead_time_hours) VALUES
  ((SELECT id FROM custom_option_groups LIMIT 1), 'As Machined', 'Standard machine finish', 1.0, 0),
  ((SELECT id FROM custom_option_groups LIMIT 1), 'Bead Blast', 'Uniform matte finish', 1.15, 24);
