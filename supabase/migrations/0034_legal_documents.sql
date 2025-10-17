-- Canonical legal document store for admin workcenter
create extension if not exists "uuid-ossp";

create table if not exists legal_documents (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  type text not null,
  title text not null,
  version text not null,
  content_md text,
  content text,
  effective_date timestamptz,
  effective_at timestamptz,
  last_updated timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'legal_documents_set_updated_at'
  ) then
    create or replace function set_legal_documents_updated_at()
    returns trigger as $$
    begin
      new.updated_at := now();
      new.last_updated := coalesce(new.last_updated, now());
      return new;
    end;
    $$ language plpgsql;

    create trigger legal_documents_set_updated_at
    before update on legal_documents
    for each row
    execute procedure set_legal_documents_updated_at();
  end if;
end $$;

create index if not exists legal_documents_type_idx on legal_documents(type);
create index if not exists legal_documents_effective_date_idx on legal_documents(effective_date desc nulls last);

alter table legal_documents enable row level security;

create policy "Service role can manage legal documents"
  on legal_documents for all
  using (coalesce(auth.jwt()->> 'role', '') = 'service_role')
  with check (coalesce(auth.jwt()->> 'role', '') = 'service_role');

create policy "Admins can read legal documents"
  on legal_documents for select
  using (
    coalesce(auth.jwt()->> 'role', '') = 'service_role'
    or coalesce(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

insert into legal_documents (slug, type, title, version, content_md, effective_date, metadata)
values
  (
    'terms',
    'terms_of_service',
    'Terms of Service',
    '1.2.0',
    '# Terms of Service\n\n## Acceptance of Terms\nUse of the CNC Quote Platform constitutes acceptance of these terms.\n\n## License\nAccess is limited to authorized business use and may not be resold or redistributed.\n\n## Service Commitments\nWe provide best-effort availability with maintenance windows announced via the admin console.\n\n## Liability\nIndirect or consequential damages are excluded to the fullest extent permitted by law.\n\n_Last updated: 2025-09-05_',
    '2025-09-05T00:00:00Z',
    jsonb_build_object('source', 'migration_0034')
  ),
  (
    'privacy',
    'privacy_policy',
    'Privacy Policy',
    '1.1.0',
    '# Privacy Policy\n\n## Data Collection\nWe store account, billing, and CAD metadata required for quote generation.\n\n## Processing Purposes\nData powers pricing, DFM analysis, and regulatory record keeping.\n\n## Retention\nOperational data is retained while an account remains active or as mandated by law.\n\n## Rights\nContact legal@cncquotes.com to exercise data access or deletion rights.\n\n_Last updated: 2025-09-05_',
    '2025-09-05T00:00:00Z',
    jsonb_build_object('source', 'migration_0034')
  )
on conflict (slug) do update
set
  version = excluded.version,
  content_md = excluded.content_md,
  effective_date = excluded.effective_date,
  last_updated = now(),
  metadata = jsonb_set(coalesce(legal_documents.metadata, '{}'::jsonb), '{source}', to_jsonb('migration_0034'));

insert into storage.buckets (id, name, public)
values ('legal-documents', 'Legal Documents', false)
on conflict (id) do nothing;

create policy "Admins can fetch legal document files"
  on storage.objects for select
  using (
    bucket_id = 'legal-documents'
    and (
      coalesce(auth.jwt()->> 'role', '') = 'service_role'
      or coalesce(auth.jwt()->> 'is_admin', 'false')::boolean = true
    )
  );

create policy "Service role can manage legal document files"
  on storage.objects for all
  using (
    bucket_id = 'legal-documents'
    and coalesce(auth.jwt()->> 'role', '') = 'service_role'
  )
  with check (
    bucket_id = 'legal-documents'
    and coalesce(auth.jwt()->> 'role', '') = 'service_role'
  );
