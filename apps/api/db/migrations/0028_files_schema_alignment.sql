-- Align files table with new upload pipeline expectations
BEGIN;

-- Rename legacy columns to standardized names (no-op if already renamed previously)
ALTER TABLE files RENAME COLUMN organization_id TO org_id;
ALTER TABLE files RENAME COLUMN bucket_id TO bucket;
ALTER TABLE files RENAME COLUMN storage_path TO path;
ALTER TABLE files RENAME COLUMN original_name TO name;
ALTER TABLE files RENAME COLUMN mime_type TO mime;
ALTER TABLE files RENAME COLUMN sha256_hash TO checksum_sha256;
ALTER TABLE files
  ALTER COLUMN checksum_sha256 DROP NOT NULL;
ALTER TABLE files RENAME COLUMN status TO virus_scan;

-- Refresh virus_scan constraint/defaults
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_status_check;
ALTER TABLE files
  ALTER COLUMN virus_scan SET DEFAULT 'pending',
  ALTER COLUMN virus_scan SET NOT NULL;
ALTER TABLE files
  ADD CONSTRAINT files_virus_scan_check
  CHECK (virus_scan IN ('pending','scanning','clean','infected','error'));

-- Add new lifecycle/association columns where missing
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS linked_type text,
  ADD COLUMN IF NOT EXISTS linked_id uuid,
  ADD COLUMN IF NOT EXISTS sensitivity text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS signed_url text,
  ADD COLUMN IF NOT EXISTS signed_url_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Ensure timestamps exist for audit use
ALTER TABLE files
  ALTER COLUMN uploaded_at SET DEFAULT TIMEZONE('utc', NOW()),
  ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW()),
  ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW());

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS files_org_id_idx ON files(org_id);
CREATE INDEX IF NOT EXISTS files_linked_type_idx ON files(linked_type);
CREATE INDEX IF NOT EXISTS files_deleted_at_idx ON files(deleted_at);

COMMIT;
