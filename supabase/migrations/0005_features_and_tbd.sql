-- Create enum for feature types
CREATE TYPE feature_type AS ENUM (
  'hole', 'pocket', 'slot', 'thread', 'bend', 'cutout',
  'chamfer', 'fillet', 'boss', 'draft', 'rib', 'undercut'
);

-- Create enum for feature complexity
CREATE TYPE feature_complexity AS ENUM ('simple', 'medium', 'complex');

-- Create enum for material thickness range
CREATE TYPE thickness_range AS ENUM ('thin', 'medium', 'thick');

-- Create feature definitions table
CREATE TABLE feature_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type feature_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create CNC feature rules
CREATE TABLE machine_feature_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  feature_type_id UUID NOT NULL REFERENCES feature_types(id) ON DELETE CASCADE,
  complexity feature_complexity NOT NULL,
  min_dimension DECIMAL(10,3), -- mm
  max_dimension DECIMAL(10,3), -- mm
  min_radius DECIMAL(10,3), -- mm
  max_depth DECIMAL(10,3), -- mm
  setup_time_minutes INTEGER,
  cycle_time_minutes INTEGER,
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, feature_type_id, complexity)
);

-- Create sheet metal specific features
CREATE TABLE sheet_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  feature_type_id UUID NOT NULL REFERENCES feature_types(id) ON DELETE CASCADE,
  thickness_range thickness_range NOT NULL,
  min_bend_radius DECIMAL(10,3), -- mm
  max_bend_angle INTEGER, -- degrees
  min_flange_length DECIMAL(10,3), -- mm
  setup_time_minutes INTEGER,
  cycle_time_minutes INTEGER,
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, feature_type_id, thickness_range)
);

-- Create injection molding specific features
CREATE TABLE im_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  feature_type_id UUID NOT NULL REFERENCES feature_types(id) ON DELETE CASCADE,
  complexity feature_complexity NOT NULL,
  min_wall_thickness DECIMAL(10,3), -- mm
  max_wall_thickness DECIMAL(10,3), -- mm
  draft_angle DECIMAL(10,2), -- degrees
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, feature_type_id, complexity)
);

-- Create TBD triggers table
CREATE TABLE tbd_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  manual_review_on_unlisted_feature BOOLEAN DEFAULT true,
  min_qty_for_review INTEGER,
  max_qty_for_review INTEGER,
  min_dimension_for_review DECIMAL(10,3), -- mm
  max_dimension_for_review DECIMAL(10,3), -- mm
  min_cost_for_review DECIMAL(10,2),
  max_cost_for_review DECIMAL(10,2),
  custom_conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add RLS policies
ALTER TABLE feature_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_feature_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE im_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbd_triggers ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature types
CREATE POLICY "Feature types are viewable by org members" ON feature_types
  FOR SELECT USING (org_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Feature types are editable by org members" ON feature_types
  FOR ALL USING (org_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- RLS policies for machine feature rules through machine
CREATE POLICY "Machine feature rules are viewable through machine" ON machine_feature_rules
  FOR SELECT USING (machine_id IN (
    SELECT id FROM machines WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  ));

-- Similar policies for sheet and IM features
CREATE POLICY "Sheet features are viewable through machine" ON sheet_features
  FOR SELECT USING (machine_id IN (
    SELECT id FROM machines WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "IM features are viewable through machine" ON im_features
  FOR SELECT USING (machine_id IN (
    SELECT id FROM machines WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  ));

-- RLS policy for TBD triggers
CREATE POLICY "TBD triggers are viewable through machine" ON tbd_triggers
  FOR ALL USING (machine_id IN (
    SELECT id FROM machines WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  ));

-- Add indexes
CREATE INDEX feature_types_org_id_idx ON feature_types(org_id);
CREATE INDEX feature_types_type_idx ON feature_types(type);
CREATE INDEX machine_feature_rules_machine_id_idx ON machine_feature_rules(machine_id);
CREATE INDEX machine_feature_rules_feature_type_id_idx ON machine_feature_rules(feature_type_id);
CREATE INDEX sheet_features_machine_id_idx ON sheet_features(machine_id);
CREATE INDEX sheet_features_feature_type_id_idx ON sheet_features(feature_type_id);
CREATE INDEX im_features_machine_id_idx ON im_features(machine_id);
CREATE INDEX im_features_feature_type_id_idx ON im_features(feature_type_id);
CREATE INDEX tbd_triggers_machine_id_idx ON tbd_triggers(machine_id);

-- Sample data
-- Commented out for local development - organizations and machines need to be created first
-- INSERT INTO feature_types (org_id, name, type, description) VALUES
--   ((SELECT id FROM organizations LIMIT 1), 'Through Hole', 'hole', 'Simple circular through hole'),
--   ((SELECT id FROM organizations LIMIT 1), 'Blind Pocket', 'pocket', 'Rectangular pocket with flat bottom'),
--   ((SELECT id FROM organizations LIMIT 1), 'Bend Line', 'bend', 'Simple sheet metal bend'),
--   ((SELECT id FROM organizations LIMIT 1), 'Thread Feature', 'thread', 'Internal or external threading'),
--   ((SELECT id FROM organizations LIMIT 1), 'Draft Angle', 'draft', 'Draft angle for molded parts');

-- Sample machine feature rules
-- INSERT INTO machine_feature_rules (
--   machine_id,
--   feature_type_id,
--   complexity,
--   min_dimension,
--   max_dimension,
--   min_radius,
--   max_depth,
--   setup_time_minutes,
--   cycle_time_minutes,
--   cost_multiplier
-- ) VALUES
--   (
--     (SELECT id FROM machines LIMIT 1),
--     (SELECT id FROM feature_types WHERE type = 'hole' LIMIT 1),
--     'simple',
--     1.0,
--     50.0,
--     0.5,
--     100.0,
--     5,
--     2,
--     1.1
--   );

-- Sample TBD triggers
-- INSERT INTO tbd_triggers (
--   machine_id,
--   manual_review_on_unlisted_feature,
--   min_qty_for_review,
--   max_qty_for_review,
--   min_cost_for_review
-- ) VALUES
--   (
--     (SELECT id FROM machines LIMIT 1),
--     true,
--     1000,
--     null,
--     5000.00
--   );
