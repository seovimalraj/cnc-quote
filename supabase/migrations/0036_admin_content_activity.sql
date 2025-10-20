-- Admin CMS and activity feed foundations (Supabase)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_cms_status') THEN
    CREATE TYPE admin_cms_status AS ENUM ('draft', 'review', 'published', 'archived');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS admin_cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status admin_cms_status NOT NULL DEFAULT 'draft',
  summary TEXT,
  content TEXT,
  hero_image TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID,
  published_at TIMESTAMPTZ,
  published_by UUID
);

CREATE INDEX IF NOT EXISTS admin_cms_pages_updated_at_idx ON admin_cms_pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS admin_cms_pages_status_idx ON admin_cms_pages(status);

CREATE TABLE IF NOT EXISTS admin_cms_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  status admin_cms_status NOT NULL DEFAULT 'draft',
  description TEXT,
  document_type TEXT,
  asset_url TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID,
  published_at TIMESTAMPTZ,
  published_by UUID
);

CREATE INDEX IF NOT EXISTS admin_cms_documents_updated_at_idx ON admin_cms_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS admin_cms_documents_status_idx ON admin_cms_documents(status);

CREATE TABLE IF NOT EXISTS admin_activity_events (
  id UUID PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  area TEXT NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  ip TEXT,
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  target_type TEXT,
  target_id TEXT,
  target_org_id UUID,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS admin_activity_events_occurred_at_idx ON admin_activity_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_events_area_idx ON admin_activity_events(area);
CREATE INDEX IF NOT EXISTS admin_activity_events_actor_idx ON admin_activity_events(actor_id);

INSERT INTO admin_activity_events (
  id,
  occurred_at,
  area,
  action,
  notes,
  ip,
  actor_id,
  actor_role,
  target_type,
  target_id,
  target_org_id,
  diff,
  created_at
)
SELECT
  ae.id,
  COALESCE(ae.ts, timezone('utc', now())) AS occurred_at,
  COALESCE(NULLIF(ae.area, ''), COALESCE(NULLIF(ae.target_type, ''), 'general')) AS area,
  COALESCE(NULLIF(ae.action, ''), 'unknown') AS action,
  ae.notes,
  COALESCE(ae.ip::text, ae.actor_ip::text),
  ae.actor_user_id,
  ae.actor_role,
  ae.target_type,
  ae.target_id,
  ae.org_id,
  CASE WHEN ae.before IS NOT NULL OR ae.after IS NOT NULL THEN jsonb_build_object('before', ae.before, 'after', ae.after) ELSE NULL END,
  timezone('utc', now())
FROM audit_events ae
ORDER BY COALESCE(ae.ts, timezone('utc', now())) DESC
LIMIT 500
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_admin_activity_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_activity_events (
    id,
    occurred_at,
    area,
    action,
    notes,
    ip,
    actor_id,
    actor_role,
    target_type,
    target_id,
    target_org_id,
    diff,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.ts, timezone('utc', now())),
    COALESCE(NULLIF(NEW.area, ''), COALESCE(NULLIF(NEW.target_type, ''), 'general')),
    COALESCE(NULLIF(NEW.action, ''), 'unknown'),
    NEW.notes,
    COALESCE(NEW.ip::text, NEW.actor_ip::text),
    NEW.actor_user_id,
    NEW.actor_role,
    NEW.target_type,
    NEW.target_id,
    NEW.org_id,
    CASE WHEN NEW.before IS NOT NULL OR NEW.after IS NOT NULL THEN jsonb_build_object('before', NEW.before, 'after', NEW.after) ELSE NULL END,
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE SET
    occurred_at = EXCLUDED.occurred_at,
    area = EXCLUDED.area,
    action = EXCLUDED.action,
    notes = EXCLUDED.notes,
    ip = EXCLUDED.ip,
    actor_id = EXCLUDED.actor_id,
    actor_role = EXCLUDED.actor_role,
    target_type = EXCLUDED.target_type,
    target_id = EXCLUDED.target_id,
    target_org_id = EXCLUDED.target_org_id,
    diff = EXCLUDED.diff;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS admin_activity_events_sync ON audit_events;
CREATE TRIGGER admin_activity_events_sync
  AFTER INSERT OR UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION sync_admin_activity_events();

INSERT INTO admin_cms_pages (id, slug, title, status, summary, content)
SELECT
  '7b7f7b2e-8f05-4f60-9a7c-2bde5c9a4100'::uuid,
  'manufacturing-overview',
  'Manufacturing Overview',
  'published',
  'Explains our CNC manufacturing coverage and SLA.',
  '## Capabilities\n\nWe support CNC milling, turning, and sheet metal with 3-5 day SLAs.'
WHERE NOT EXISTS (SELECT 1 FROM admin_cms_pages);

INSERT INTO admin_cms_documents (id, title, slug, status, description, document_type, asset_url)
SELECT
  '94c215cb-2b6f-4c54-9d8d-4983427c9d11'::uuid,
  'Quality Handbook',
  'quality-handbook',
  'review',
  'Internal quality SOPs for machinists and inspectors.',
  'pdf',
  'https://cdn.example.com/docs/quality-handbook.pdf'
WHERE NOT EXISTS (SELECT 1 FROM admin_cms_documents);

ALTER TABLE admin_cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_cms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_cms_pages_service_only" ON admin_cms_pages
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admin_cms_documents_service_only" ON admin_cms_documents
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admin_activity_events_service_only" ON admin_activity_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
