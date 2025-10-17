-- Admin workcenter observability scaffolding (dummy but queryable data)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS admin_webhook_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  failed_24h INTEGER NOT NULL DEFAULT 0,
  last_event_type TEXT,
  last_delivery_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_webhook_status_provider_idx
  ON admin_webhook_status(provider);

CREATE INDEX IF NOT EXISTS admin_webhook_status_updated_at_idx
  ON admin_webhook_status(updated_at DESC);

ALTER TABLE admin_webhook_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook status"
  ON admin_webhook_status FOR SELECT
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

CREATE POLICY "Admins can manage webhook status"
  ON admin_webhook_status FOR ALL
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

INSERT INTO admin_webhook_status (provider, status, failed_24h, last_event_type, last_delivery_at)
VALUES
  ('stripe', 'OK', 0, 'checkout.session.completed', NOW() - INTERVAL '35 seconds'),
  ('paypal', 'WARN', 2, 'PAYMENT.CAPTURE.COMPLETED', NOW() - INTERVAL '4 minutes')
ON CONFLICT (provider) DO UPDATE
  SET status = EXCLUDED.status,
      failed_24h = EXCLUDED.failed_24h,
      last_event_type = EXCLUDED.last_event_type,
      last_delivery_at = EXCLUDED.last_delivery_at,
      updated_at = NOW();

CREATE TABLE IF NOT EXISTS admin_error_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  service TEXT NOT NULL,
  title TEXT NOT NULL,
  count_1h INTEGER NOT NULL DEFAULT 0,
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  users_affected INTEGER,
  permalink TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_error_events_last_seen_idx
  ON admin_error_events(last_seen DESC);

ALTER TABLE admin_error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view error events"
  ON admin_error_events FOR SELECT
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

CREATE POLICY "Admins can manage error events"
  ON admin_error_events FOR ALL
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

INSERT INTO admin_error_events (source, service, title, count_1h, first_seen, last_seen, users_affected, permalink)
VALUES
  (
    'sentry',
    'api',
    'TypeError: Cannot read property "x" of undefined',
    7,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '5 minutes',
    2,
    'https://sentry.io/organizations/cnc-quote/issues/1'
  ),
  (
    'sentry',
    'worker',
    'TimeoutError: CAD analysis exceeded threshold',
    3,
    NOW() - INTERVAL '90 minutes',
    NOW() - INTERVAL '25 minutes',
    1,
    'https://sentry.io/organizations/cnc-quote/issues/2'
  )
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_failed_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue TEXT NOT NULL,
  job_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_failed_jobs_occurred_at_idx
  ON admin_failed_jobs(occurred_at DESC);

ALTER TABLE admin_failed_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view failed job snapshots"
  ON admin_failed_jobs FOR SELECT
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

CREATE POLICY "Admins can manage failed job snapshots"
  ON admin_failed_jobs FOR ALL
  USING (
    COALESCE(auth.jwt()->> 'role', '') = 'service_role'
    OR COALESCE(auth.jwt()->> 'is_admin', 'false')::boolean = true
  );

INSERT INTO admin_failed_jobs (queue, job_id, attempts, reason, occurred_at)
VALUES
  ('cad:analyze', 'cad-job-001', 3, 'CAD kernel timeout after 120s', NOW() - INTERVAL '12 minutes'),
  ('pdf:render', 'pdf-job-211', 2, 'Missing drawing attachment', NOW() - INTERVAL '32 minutes'),
  ('pricing:calculate', 'pricing-job-887', 1, 'Unsupported material grade', NOW() - INTERVAL '55 minutes')
ON CONFLICT DO NOTHING;
