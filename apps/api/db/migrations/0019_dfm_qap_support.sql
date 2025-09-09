-- Update QAP documents table to support DFM-based QAPs
-- Make order_id and order_item_id optional
-- Add dfm_request_id for DFM-based QAPs

alter table qap_documents
  alter column order_id drop not null,
  alter column order_item_id drop not null,
  add column dfm_request_id uuid references dfm_requests(id),
  add column download_url text,
  add column completed_at timestamptz,
  add column error_message text;

-- Update RLS policies to allow DFM-based QAPs
drop policy if exists "QA users can insert QAP documents." on qap_documents;
drop policy if exists "QA users can update QAP documents for their org." on qap_documents;

create policy "Users can insert QAP documents for their org."
  on qap_documents for insert
  with check (org_id in (
    select org_id from org_users where user_id = auth.uid()
  ));

create policy "Users can update QAP documents for their org."
  on qap_documents for update
  using (org_id in (
    select org_id from org_users where user_id = auth.uid()
  ));

-- Add index for DFM request lookups
create index idx_qap_documents_dfm_request_id on qap_documents(dfm_request_id);
