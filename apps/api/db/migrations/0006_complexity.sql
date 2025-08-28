-- Create enum for complexity formula types
CREATE TYPE complexity_formula AS ENUM ('surface_area_to_volume', 'features_count', 'custom');

-- Create complexity settings table
CREATE TABLE complexity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  formula complexity_formula NOT NULL DEFAULT 'surface_area_to_volume',
  k_factor DECIMAL(10,4) DEFAULT 1.0,
  min_volume DECIMAL(10,3), -- cm³
  min_surface_area DECIMAL(10,3), -- cm²
  features_weight DECIMAL(10,4) DEFAULT 0.5,
  custom_formula TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id)
);

-- Create complexity brackets table
CREATE TABLE complexity_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_value DECIMAL(10,4),
  max_value DECIMAL(10,4),
  multiplier DECIMAL(10,4) NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, min_value, max_value),
  CHECK (min_value <= max_value),
  CHECK (multiplier >= 1.0)
);

-- Add RLS policies
ALTER TABLE complexity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complexity_brackets ENABLE ROW LEVEL SECURITY;

-- RLS policies for complexity settings
CREATE POLICY "Complexity settings are viewable through machine" ON complexity_settings
  FOR ALL USING (machine_id IN (
    SELECT id FROM machines WHERE organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  ));

-- RLS policies for complexity brackets
CREATE POLICY "Complexity brackets are viewable through machine" ON complexity_brackets
  FOR ALL USING (machine_id IN (
    SELECT id FROM machines WHERE organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  ));

-- Add indexes
CREATE INDEX complexity_settings_machine_id_idx ON complexity_settings(machine_id);
CREATE INDEX complexity_brackets_machine_id_idx ON complexity_brackets(machine_id);
CREATE INDEX complexity_brackets_sort_order_idx ON complexity_brackets(machine_id, sort_order);

-- Sample data
INSERT INTO complexity_settings (
  machine_id,
  formula,
  k_factor,
  min_volume,
  min_surface_area,
  features_weight
) VALUES (
  (SELECT id FROM machines WHERE process_type = 'milling' LIMIT 1),
  'surface_area_to_volume',
  1.2,
  1.0,
  1.0,
  0.4
);

INSERT INTO complexity_brackets (
  machine_id,
  name,
  description,
  min_value,
  max_value,
  multiplier,
  sort_order
) VALUES 
  (
    (SELECT id FROM machines WHERE process_type = 'milling' LIMIT 1),
    'Very Simple',
    'Basic shapes with minimal features',
    0.0,
    2.0,
    1.0,
    0
  ),
  (
    (SELECT id FROM machines WHERE process_type = 'milling' LIMIT 1),
    'Simple',
    'Simple shapes with basic features',
    2.0,
    4.0,
    1.2,
    1
  ),
  (
    (SELECT id FROM machines WHERE process_type = 'milling' LIMIT 1),
    'Moderate',
    'Moderate complexity with multiple features',
    4.0,
    6.0,
    1.5,
    2
  ),
  (
    (SELECT id FROM machines WHERE process_type = 'milling' LIMIT 1),
    'Complex',
    'Complex shapes with many features',
    6.0,
    8.0,
    2.0,
    3
  ),
  (
    (SELECT id FROM machines WHERE process_type = 'milling' LIMIT 1),
    'Highly Complex',
    'Very complex shapes with intricate features',
    8.0,
    null,
    3.0,
    4
  );
