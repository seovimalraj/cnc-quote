-- Geometry features persistence for CAD analysis outputs
create table if not exists public.geometry_features (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  org_id uuid not null,
  features_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_geometry_features_part_id on public.geometry_features(part_id);
create index if not exists idx_geometry_features_org_id on public.geometry_features(org_id);
