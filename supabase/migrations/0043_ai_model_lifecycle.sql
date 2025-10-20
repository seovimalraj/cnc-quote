CREATE TABLE ai_model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('retrain', 'rollback', 'bias_review')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  target_version TEXT,
  triggered_by TEXT,
  git_ref TEXT,
  trace_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX ai_model_runs_model_status_idx ON ai_model_runs (model_id, status);
CREATE INDEX ai_model_runs_created_idx ON ai_model_runs (created_at DESC);

ALTER TABLE ai_model_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_model_runs_service_only"
  ON ai_model_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE ai_model_bias_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  run_id UUID REFERENCES ai_model_runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'acknowledged', 'completed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  stakeholders TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  checklist_url TEXT NOT NULL,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX ai_model_bias_reviews_model_idx ON ai_model_bias_reviews (model_id, status);

ALTER TABLE ai_model_bias_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_model_bias_reviews_service_only"
  ON ai_model_bias_reviews
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
