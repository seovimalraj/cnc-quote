-- Migration 0039: Capacity Ledger + Lead Time Classes
-- Step 12: Model daily machine-group capacity and expose dynamic lead-time classes

-- Create lead time class enum
CREATE TYPE leadtime_class AS ENUM ('econ','standard','express');

-- Lead time profiles table (per org, per process)
CREATE TABLE IF NOT EXISTS leadtime_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  process TEXT NOT NULL, -- e.g. 'cnc_milling','turning','sheet','im'
  econ_days INT NOT NULL DEFAULT 10,
  std_days INT NOT NULL DEFAULT 7,
  express_days INT NOT NULL DEFAULT 3,
  surge_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, process)
);

-- Capacity ledger: daily capacity tracking per machine group
CREATE TABLE IF NOT EXISTS capacity_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  process TEXT NOT NULL,
  machine_group TEXT NOT NULL, -- e.g. 'cnc-3axis', 'cnc-5axis', 'lathe', 'press-brake'
  day DATE NOT NULL, -- in org tz (stored as date, interpret in tz)
  capacity_minutes INT NOT NULL CHECK (capacity_minutes >= 0),
  booked_minutes INT NOT NULL DEFAULT 0 CHECK (booked_minutes >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, process, machine_group, day)
);

-- Index for efficient capacity window queries
CREATE INDEX IF NOT EXISTS idx_capacity_ledger_org_proc_day 
  ON capacity_ledger(org_id, process, day);

CREATE INDEX IF NOT EXISTS idx_capacity_ledger_org_proc_group_day 
  ON capacity_ledger(org_id, process, machine_group, day);

-- Lead time overrides: block or unblock classes on specific days
CREATE TABLE IF NOT EXISTS leadtime_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  process TEXT NOT NULL,
  day DATE NOT NULL,
  class leadtime_class NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT FALSE, -- when TRUE, class unavailable that day
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, process, day, class)
);

CREATE INDEX IF NOT EXISTS idx_leadtime_overrides_org_proc_day 
  ON leadtime_overrides(org_id, process, day);

-- Extend quotes table with lead time selections
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS selected_lead_class leadtime_class;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS promised_ship_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS leadtime_calc_json JSONB;

-- Seed default lead time profiles for existing orgs
INSERT INTO leadtime_profiles (org_id, process, econ_days, std_days, express_days, surge_multiplier)
SELECT o.id, p.proc, 10, 7, 3, 1.15
FROM orgs o 
CROSS JOIN (
  VALUES 
    ('cnc_milling'),
    ('turning'),
    ('sheet'),
    ('im')
) AS p(proc)
ON CONFLICT (org_id, process) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE leadtime_profiles IS 'Per-org lead time configuration for each manufacturing process';
COMMENT ON TABLE capacity_ledger IS 'Daily capacity tracking by machine group for utilization-based surge pricing';
COMMENT ON TABLE leadtime_overrides IS 'Manual blocks/unblocks for specific lead time classes on specific days';
COMMENT ON COLUMN capacity_ledger.capacity_minutes IS 'Total available minutes for this machine group on this day';
COMMENT ON COLUMN capacity_ledger.booked_minutes IS 'Minutes already allocated to orders';
COMMENT ON COLUMN leadtime_overrides.blocked IS 'When TRUE, this class is unavailable on this day regardless of utilization';
COMMENT ON COLUMN quotes.leadtime_calc_json IS 'Snapshot of lead time calculation details (utilization, surge, etc)';
