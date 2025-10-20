ALTER TABLE admin_pricing_revision_runs
  ADD COLUMN org_id UUID;

CREATE TABLE admin_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  run_id UUID,
  trigger TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_preview TEXT,
  prompt_digest TEXT,
  prompt_payload JSONB,
  response_preview TEXT,
  response_digest TEXT,
  response_payload JSONB,
  latency_ms INTEGER,
  trace_id TEXT,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX admin_ai_prompts_org_created_idx ON admin_ai_prompts (org_id, created_at DESC);
CREATE INDEX admin_ai_prompts_run_idx ON admin_ai_prompts (run_id);

ALTER TABLE admin_ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ai_prompts_service_only"
  ON admin_ai_prompts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
