-- quote_compliance_events table tracks pricing compliance outputs for audit trails
create table if not exists public.quote_compliance_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  quote_item_id uuid not null references public.quote_items(id) on delete cascade,
  part_id uuid references public.quote_items(id) on delete set null,
  code text not null,
  severity text not null check (severity in ('warning', 'critical')),
  quantity integer not null,
  message text not null,
  payload jsonb not null,
  trace_id text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists quote_compliance_events_quote_id_idx on public.quote_compliance_events (quote_id);
create index if not exists quote_compliance_events_item_id_idx on public.quote_compliance_events (quote_item_id);
create index if not exists quote_compliance_events_trace_id_idx on public.quote_compliance_events (trace_id);

alter table public.quote_compliance_events enable row level security;

drop policy if exists "service-role-access-quote-compliance" on public.quote_compliance_events;
create policy "service-role-access-quote-compliance"
  on public.quote_compliance_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
