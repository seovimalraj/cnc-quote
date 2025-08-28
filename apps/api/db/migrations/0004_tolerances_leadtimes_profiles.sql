-- Create enum for profile status
CREATE TYPE profile_status AS ENUM ('draft', 'published');

-- Create tolerances table
CREATE TABLE tolerances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  lead_time_hours INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create lead times table
CREATE TABLE lead_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hours INTEGER NOT NULL,
  description TEXT,
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create pricing profiles table
CREATE TABLE pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status profile_status DEFAULT 'draft',
  effective_from TIMESTAMP WITH TIME ZONE,
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create machine tolerances table
CREATE TABLE machine_tolerances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  tolerance_id UUID NOT NULL REFERENCES tolerances(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, tolerance_id, profile_id)
);

-- Create machine lead times table
CREATE TABLE machine_lead_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  lead_time_id UUID NOT NULL REFERENCES lead_times(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, lead_time_id, profile_id)
);

-- Create machine profile links
CREATE TABLE machine_profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  cost_multiplier DECIMAL(10,4) DEFAULT 1,
  setup_cost DECIMAL(10,2) DEFAULT 0,
  min_order_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(machine_id, profile_id)
);

-- Add RLS policies
ALTER TABLE tolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_tolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_lead_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_profile_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for tolerances
CREATE POLICY "Tolerances are viewable by org members" ON tolerances
  FOR SELECT USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Tolerances are editable by org members" ON tolerances
  FOR ALL USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

-- RLS policies for lead times
CREATE POLICY "Lead times are viewable by org members" ON lead_times
  FOR SELECT USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Lead times are editable by org members" ON lead_times
  FOR ALL USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

-- RLS policies for pricing profiles
CREATE POLICY "Pricing profiles are viewable by org members" ON pricing_profiles
  FOR SELECT USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Pricing profiles are editable by org members" ON pricing_profiles
  FOR ALL USING (org_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  ));

-- RLS policies for machine tolerances through machine and tolerance
CREATE POLICY "Machine tolerances are viewable through machine or tolerance" ON machine_tolerances
  FOR SELECT USING (
    machine_id IN (
      SELECT id FROM machines WHERE organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    ) OR tolerance_id IN (
      SELECT id FROM tolerances WHERE org_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for machine lead times through machine and lead time
CREATE POLICY "Machine lead times are viewable through machine or lead time" ON machine_lead_times
  FOR SELECT USING (
    machine_id IN (
      SELECT id FROM machines WHERE organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    ) OR lead_time_id IN (
      SELECT id FROM lead_times WHERE org_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for machine profile links
CREATE POLICY "Machine profile links are viewable through machine or profile" ON machine_profile_links
  FOR SELECT USING (
    machine_id IN (
      SELECT id FROM machines WHERE organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    ) OR profile_id IN (
      SELECT id FROM pricing_profiles WHERE org_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- Add indexes
CREATE INDEX tolerances_org_id_idx ON tolerances(org_id);
CREATE INDEX lead_times_org_id_idx ON lead_times(org_id);
CREATE INDEX pricing_profiles_org_id_idx ON pricing_profiles(org_id);
CREATE INDEX pricing_profiles_status_idx ON pricing_profiles(status);
CREATE INDEX machine_tolerances_machine_id_idx ON machine_tolerances(machine_id);
CREATE INDEX machine_tolerances_tolerance_id_idx ON machine_tolerances(tolerance_id);
CREATE INDEX machine_tolerances_profile_id_idx ON machine_tolerances(profile_id);
CREATE INDEX machine_lead_times_machine_id_idx ON machine_lead_times(machine_id);
CREATE INDEX machine_lead_times_lead_time_id_idx ON machine_lead_times(lead_time_id);
CREATE INDEX machine_lead_times_profile_id_idx ON machine_lead_times(profile_id);
CREATE INDEX machine_profile_links_machine_id_idx ON machine_profile_links(machine_id);
CREATE INDEX machine_profile_links_profile_id_idx ON machine_profile_links(profile_id);

-- Sample data
INSERT INTO tolerances (org_id, name, description, cost_multiplier, lead_time_hours)
VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Standard (±0.1mm)', 'General purpose machining', 1, 0),
  ((SELECT id FROM organizations LIMIT 1), 'Precision (±0.05mm)', 'High precision parts', 1.2, 24),
  ((SELECT id FROM organizations LIMIT 1), 'Ultra Precision (±0.01mm)', 'Critical components', 1.5, 48);

INSERT INTO lead_times (org_id, name, hours, description, cost_multiplier)
VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Standard', 120, '5 business days', 1),
  ((SELECT id FROM organizations LIMIT 1), 'Express', 72, '3 business days', 1.3),
  ((SELECT id FROM organizations LIMIT 1), 'Rush', 24, 'Next business day', 1.8);

INSERT INTO pricing_profiles (org_id, name, status)
VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Default Profile', 'published');
