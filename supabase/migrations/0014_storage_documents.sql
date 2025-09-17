-- Create storage bucket for QAP documents
insert into storage.buckets (id, name, public) 
values ('documents', 'Quality Documents', false);

-- Allow authenticated users to read documents from their org
create policy "Users can read documents from their org"
  on storage.objects for select
  using (
    bucket_id = 'documents' 
    and (
      exists (
        select 1 
        from qap_documents qd
        join org_users ou on ou.org_id = qd.org_id
        where qd.file_path = name
        and ou.user_id = auth.uid()
      )
    )
  );

-- Allow service role to upload documents
create policy "Service role can upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' 
    and auth.role() = 'service_role'
  );

-- Allow service role to update documents
create policy "Service role can update documents"
  on storage.objects for update
  using (
    bucket_id = 'documents' 
    and auth.role() = 'service_role'
  );
