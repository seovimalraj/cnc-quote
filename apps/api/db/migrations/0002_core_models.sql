-- Create enum types
CREATE TYPE technology AS ENUM ('cnc', 'sheet_metal', 'injection_molding');
CREATE TYPE process_type AS ENUM ('milling', 'turning', 'laser_cutting', 'press_brake', 'injection');
CREATE TYPE machine_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE dimension AS ENUM ('x', 'y', 'z', 'diameter');
CREATE TYPE message_type AS ENUM ('error', 'warning', 'info');
CREATE TYPE unit AS ENUM ('mm', 'inch');

-- Create processes table
CREATE TABLE public.processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    technology technology NOT NULL,
    process_type process_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Create machines table
CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    technology technology NOT NULL,
    process_type process_type NOT NULL,
    model TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    year INTEGER,
    status machine_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Create machine_specs table
CREATE TABLE public.machine_specs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(machine_id, key)
);

-- Create machine_limits table
CREATE TABLE public.machine_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    dimension dimension NOT NULL,
    min DECIMAL NOT NULL,
    max DECIMAL NOT NULL,
    unit unit NOT NULL DEFAULT 'mm',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(machine_id, dimension)
);

-- Create machine_messages table
CREATE TABLE public.machine_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    type message_type NOT NULL,
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    params JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view processes in their organization"
    ON public.processes
    FOR ALL
    USING (organization_id::TEXT = auth.jwt()->>'org_id');

CREATE POLICY "Users can view machines in their organization"
    ON public.machines
    FOR ALL
    USING (organization_id::TEXT = auth.jwt()->>'org_id');

CREATE POLICY "Users can view machine specs in their organization"
    ON public.machine_specs
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.machines
        WHERE machines.id = machine_specs.machine_id
        AND machines.organization_id::TEXT = auth.jwt()->>'org_id'
    ));

CREATE POLICY "Users can view machine limits in their organization"
    ON public.machine_limits
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.machines
        WHERE machines.id = machine_limits.machine_id
        AND machines.organization_id::TEXT = auth.jwt()->>'org_id'
    ));

CREATE POLICY "Users can view machine messages in their organization"
    ON public.machine_messages
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.machines
        WHERE machines.id = machine_messages.machine_id
        AND machines.organization_id::TEXT = auth.jwt()->>'org_id'
    ));

-- Create indexes
CREATE INDEX idx_processes_org_tech ON public.processes(organization_id, technology);
CREATE INDEX idx_machines_org_tech ON public.machines(organization_id, technology);
CREATE INDEX idx_processes_created ON public.processes(created_at DESC);
CREATE INDEX idx_machines_created ON public.machines(created_at DESC);

-- Seed sample data
INSERT INTO public.processes (organization_id, technology, process_type, name, description) VALUES
    -- Sample org ID will need to be replaced with actual org ID
    ('11111111-1111-1111-1111-111111111111', 'cnc', 'milling', '3-Axis Milling', '3-axis CNC milling for general purpose machining'),
    ('11111111-1111-1111-1111-111111111111', 'sheet_metal', 'laser_cutting', 'Fiber Laser Cutting', 'High-precision fiber laser cutting'),
    ('11111111-1111-1111-1111-111111111111', 'sheet_metal', 'press_brake', 'Press Brake Bending', 'Sheet metal bending and forming'),
    ('11111111-1111-1111-1111-111111111111', 'injection_molding', 'injection', 'Injection Molding', 'Plastic injection molding');

INSERT INTO public.machines (organization_id, name, technology, process_type, model, manufacturer, year, status) VALUES
    -- CNC Machines
    ('11111111-1111-1111-1111-111111111111', 'HAAS VF-2', 'cnc', 'milling', 'VF-2', 'HAAS', 2023, 'active'),
    -- Sheet Metal Machines
    ('11111111-1111-1111-1111-111111111111', 'Trumpf TruLaser 3030', 'sheet_metal', 'laser_cutting', 'TruLaser 3030', 'Trumpf', 2023, 'active'),
    ('11111111-1111-1111-1111-111111111111', 'Trumpf TruBend 5130', 'sheet_metal', 'press_brake', 'TruBend 5130', 'Trumpf', 2023, 'active'),
    -- Injection Molding Machines
    ('11111111-1111-1111-1111-111111111111', 'ARBURG 470 A', 'injection_molding', 'injection', '470 A', 'ARBURG', 2023, 'active');

-- Add machine specs
INSERT INTO public.machine_specs (machine_id, key, value, unit) VALUES
    -- HAAS VF-2 Specs
    ((SELECT id FROM public.machines WHERE name = 'HAAS VF-2'), 'spindle_speed', '12000', 'rpm'),
    ((SELECT id FROM public.machines WHERE name = 'HAAS VF-2'), 'power', '22.4', 'kW'),
    -- TruLaser 3030 Specs
    ((SELECT id FROM public.machines WHERE name = 'Trumpf TruLaser 3030'), 'power', '6000', 'W'),
    ((SELECT id FROM public.machines WHERE name = 'Trumpf TruLaser 3030'), 'positioning_accuracy', '0.05', 'mm');

-- Add machine limits
INSERT INTO public.machine_limits (machine_id, dimension, min, max, unit) VALUES
    -- HAAS VF-2 Limits
    ((SELECT id FROM public.machines WHERE name = 'HAAS VF-2'), 'x', 0, 762, 'mm'),
    ((SELECT id FROM public.machines WHERE name = 'HAAS VF-2'), 'y', 0, 406, 'mm'),
    ((SELECT id FROM public.machines WHERE name = 'HAAS VF-2'), 'z', 0, 508, 'mm'),
    -- TruLaser 3030 Limits
    ((SELECT id FROM public.machines WHERE name = 'Trumpf TruLaser 3030'), 'x', 0, 3000, 'mm'),
    ((SELECT id FROM public.machines WHERE name = 'Trumpf TruLaser 3030'), 'y', 0, 1500, 'mm');
