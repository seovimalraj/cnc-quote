-- Create DFM rules table
CREATE TABLE dfm_rules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  process_type text NOT NULL CHECK (process_type IN ('cnc', 'sheet_metal', 'injection_molding')),
  severity text NOT NULL CHECK (severity IN ('warn', 'block')),
  condition text NOT NULL, -- expr-eval compatible expression
  message text NOT NULL,
  triggers_manual_review boolean NOT NULL DEFAULT false,
  org_id uuid REFERENCES organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE dfm_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "DFM rules are viewable by authenticated users of the same organization" ON dfm_rules
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    (
      org_id IS NULL OR -- Global rules
      org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "DFM rules are insertable by admins of the same organization" ON dfm_rules
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "DFM rules are updatable by admins of the same organization" ON dfm_rules
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "DFM rules are deletable by admins of the same organization" ON dfm_rules
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Index for performance
CREATE INDEX dfm_rules_process_type_idx ON dfm_rules(process_type);
CREATE INDEX dfm_rules_org_id_idx ON dfm_rules(org_id);

-- Insert sample rules
INSERT INTO dfm_rules (name, description, process_type, severity, condition, message, triggers_manual_review) VALUES
-- CNC Rules
('Min Wall Thickness', 'Check if wall thickness is below minimum for material', 'cnc', 'block', 
 'min_wall_thickness < 1.0', 'Wall thickness must be at least 1mm', false),

('Tool Reach Depth', 'Check if features are beyond max tool reach', 'cnc', 'block',
 'max_tool_reach_depth > 150', 'Feature depth exceeds maximum tool reach of 150mm', true),

('Drill Grid Spacing', 'Check if holes are too close together', 'cnc', 'warn',
 'drill_grid_spacing < 2.0', 'Holes should be spaced at least 2mm apart', false),

('Slot Aspect Ratio', 'Check if slot dimensions are manufacturable', 'cnc', 'warn',
 'slot_aspect_ratio > 10', 'Slot aspect ratio exceeds recommended maximum of 10:1', true),

-- Sheet Metal Rules
('Min Hole vs Thickness', 'Check if hole diameter is appropriate for material thickness', 'sheet_metal', 'block',
 'min_hole_diameter < material_thickness', 'Hole diameter must be greater than material thickness', false),

('Min Flange Length', 'Check if flange length is sufficient', 'sheet_metal', 'warn',
 'min_flange_length < 5', 'Flange length should be at least 5mm', false),

('Bend to Hole Distance', 'Check if holes are too close to bends', 'sheet_metal', 'block',
 'min_hole_to_bend < 2 * material_thickness', 'Holes must be at least 2x material thickness from bends', true),

('Panel Size', 'Check if panel size exceeds machine capacity', 'sheet_metal', 'block',
 'max_panel_size.x > 3000 || max_panel_size.y > 1500', 'Panel size exceeds maximum machine capacity', false),

-- Injection Molding Rules
('Clamp Tonnage', 'Check if part requires excessive clamp force', 'injection_molding', 'block',
 'clamp_tonnage > 100', 'Required clamp tonnage exceeds machine capacity', true),

('Draft Angle', 'Check if draft angles are sufficient', 'injection_molding', 'warn',
 'min_draft_angle < 1.0', 'Draft angles should be at least 1 degree', false),

('Wall Uniformity', 'Check if wall thickness variations are within limits', 'injection_molding', 'warn',
 'max_wall_thickness / min_wall_thickness > 3', 'Wall thickness variation should not exceed 3:1', true),

('Undercuts', 'Check if number of undercuts is reasonable', 'injection_molding', 'warn',
 'undercut_count > 2', 'Design has multiple undercuts - may require complex tooling', true);
