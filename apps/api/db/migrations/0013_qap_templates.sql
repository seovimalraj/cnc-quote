-- Create QAP templates table
create table qap_templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  description text,
  template_html text not null,
  schema_json jsonb not null,
  process_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id)
);

-- Add RLS policies
alter table qap_templates enable row level security;

create policy "Users can view QAP templates for their org."
  on qap_templates for select
  using (org_id in (
    select org_id from org_users where user_id = auth.uid()
  ));

create policy "Admins can insert QAP templates."
  on qap_templates for insert
  with check (org_id in (
    select org_id from org_users 
    where user_id = auth.uid() 
    and role = 'admin'
  ));

create policy "Admins can update QAP templates for their org."
  on qap_templates for update
  using (org_id in (
    select org_id from org_users 
    where user_id = auth.uid() 
    and role = 'admin'
  ));

-- Create QAP documents table
create table qap_documents (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  template_id uuid not null references qap_templates(id),
  order_id uuid not null references orders(id),
  order_item_id uuid not null references order_items(id),
  file_path text not null,
  status text not null default 'draft',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id)
);

-- Add RLS policies
alter table qap_documents enable row level security;

create policy "Users can view QAP documents for their org."
  on qap_documents for select
  using (org_id in (
    select org_id from org_users where user_id = auth.uid()
  ));

create policy "QA users can insert QAP documents."
  on qap_documents for insert
  with check (org_id in (
    select org_id from org_users 
    where user_id = auth.uid() 
    and role in ('admin', 'qa')
  ));

create policy "QA users can update QAP documents for their org."
  on qap_documents for update
  using (org_id in (
    select org_id from org_users 
    where user_id = auth.uid() 
    and role in ('admin', 'qa')
  ));
