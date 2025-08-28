-- Create pricing profiles table
CREATE TABLE pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  setup_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  machine_rate_per_hour DECIMAL(10,2) NOT NULL,
  min_order_qty INTEGER NOT NULL DEFAULT 1,
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_price_per_part DECIMAL(10,2) NOT NULL DEFAULT 0,
  margin DECIMAL(5,4) NOT NULL DEFAULT 0.3,
  overhead DECIMAL(5,4) NOT NULL DEFAULT 0.1,
  rush_surcharge DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  standard_lead_time INTEGER NOT NULL DEFAULT 10,
  rush_lead_time INTEGER NOT NULL DEFAULT 3,
  -- Process specific fields
  -- CNC
  material_removal_rate_cc_min DECIMAL(10,2),
  surface_finish_rate_cm2_min DECIMAL(10,2),
  feature_times JSONB DEFAULT '{"hole": 30, "pocket": 60, "slot": 45, "face": 20}',
  -- Sheet Metal
  cutting_speed_mm_min DECIMAL(10,2),
  pierce_time_s DECIMAL(5,2),
  bend_time_s DECIMAL(5,2),
  min_thickness_mm DECIMAL(5,2),
  max_thickness_mm DECIMAL(5,2),
  -- Injection Molding
  max_tonnage INTEGER,
  max_shot_volume_cc DECIMAL(10,2),
  min_cavity_spacing_mm DECIMAL(5,2),
  qa_cost_per_part DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, name)
);

-- Create quantity breaks table
CREATE TABLE quantity_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL,
  discount DECIMAL(5,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(profile_id, min_qty)
);

-- Enable RLS
ALTER TABLE pricing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantity_breaks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Pricing profiles viewable through machine" ON pricing_profiles
  FOR ALL USING (machine_id IN (
    SELECT id FROM machines WHERE organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Quantity breaks viewable through profile" ON quantity_breaks
  FOR ALL USING (profile_id IN (
    SELECT id FROM pricing_profiles WHERE machine_id IN (
      SELECT id FROM machines WHERE organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  ));

-- Add indexes
CREATE INDEX pricing_profiles_machine_id_idx ON pricing_profiles(machine_id);
CREATE INDEX quantity_breaks_profile_id_idx ON quantity_breaks(profile_id);
CREATE INDEX quantity_breaks_min_qty_idx ON quantity_breaks(profile_id, min_qty);

-- Sample data
INSERT INTO pricing_profiles (
  machine_id,
  name,
  description,
  setup_cost,
  machine_rate_per_hour,
  min_order_qty,
  min_order_value,
  min_price_per_part,
  margin,
  overhead,
  material_removal_rate_cc_min,
  surface_finish_rate_cm2_min,
  feature_times,
  qa_cost_per_part
) VALUES (
  (SELECT id FROM machines WHERE process_type = 'milling' LIMIT 1),
  'Standard CNC',
  'Default pricing profile for milling operations',
  100.00,
  150.00,
  1,
  100.00,
  10.00,
  0.3,
  0.1,
  5.0,
  10.0,
  '{"hole": 30, "pocket": 60, "slot": 45, "face": 20}',
  5.00
);

INSERT INTO quantity_breaks (
  profile_id,
  min_qty,
  discount
) VALUES 
  ((SELECT id FROM pricing_profiles LIMIT 1), 10, 0.05),
  ((SELECT id FROM pricing_profiles LIMIT 1), 50, 0.10),
  ((SELECT id FROM pricing_profiles LIMIT 1), 100, 0.15),
  ((SELECT id FROM pricing_profiles LIMIT 1), 500, 0.20);
