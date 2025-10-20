BEGIN;

CREATE TABLE IF NOT EXISTS dfm_annotation_corpus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE SET NULL,
  geometry_hash text NOT NULL,
  process_type text NOT NULL CHECK (process_type IN ('cnc', 'sheet_metal', 'injection_molding')),
  issue_code text NOT NULL,
  issue_summary text NOT NULL,
  remediation text NOT NULL,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dfm_annotation_corpus_geometry
  ON dfm_annotation_corpus(geometry_hash);
CREATE INDEX IF NOT EXISTS idx_dfm_annotation_corpus_process
  ON dfm_annotation_corpus(process_type);

ALTER TABLE dfm_annotation_corpus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dfm_annotation_corpus_select ON dfm_annotation_corpus;
CREATE POLICY dfm_annotation_corpus_select ON dfm_annotation_corpus
  FOR SELECT
  USING (
    org_id IS NULL
    OR org_id::text = auth.jwt() ->> 'org_id'
    OR auth.role() = 'service_role'
  );

CREATE TABLE IF NOT EXISTS dfm_copilot_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_id uuid REFERENCES dfm_annotation_corpus(id) ON DELETE SET NULL,
  dataset_version text NOT NULL,
  prompt text NOT NULL,
  completion text NOT NULL,
  geometry_hash text NOT NULL,
  process_type text NOT NULL CHECK (process_type IN ('cnc', 'sheet_metal', 'injection_molding')),
  issue_code text NOT NULL,
  org_id uuid REFERENCES orgs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dfm_copilot_samples_dataset
  ON dfm_copilot_samples(dataset_version);
CREATE INDEX IF NOT EXISTS idx_dfm_copilot_samples_geometry
  ON dfm_copilot_samples(geometry_hash);

ALTER TABLE dfm_copilot_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dfm_copilot_samples_select ON dfm_copilot_samples;
CREATE POLICY dfm_copilot_samples_select ON dfm_copilot_samples
  FOR SELECT
  USING (
    org_id IS NULL
    OR org_id::text = auth.jwt() ->> 'org_id'
    OR auth.role() = 'service_role'
  );

CREATE TABLE IF NOT EXISTS dfm_copilot_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  base_model text NOT NULL,
  adapter_uri text,
  status text NOT NULL CHECK (status IN ('training', 'failed', 'published')),
  dataset_version text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  geometry_hash_coverage text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  failure_reason text
);

CREATE INDEX IF NOT EXISTS idx_dfm_copilot_models_status
  ON dfm_copilot_models(status);

ALTER TABLE dfm_copilot_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dfm_copilot_models_select ON dfm_copilot_models;
CREATE POLICY dfm_copilot_models_select ON dfm_copilot_models
  FOR SELECT
  USING (status = 'published' OR auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS dfm_copilot_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid,
  part_id uuid,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  geometry_hash text NOT NULL,
  model_version text NOT NULL,
  guidance jsonb NOT NULL,
  issues jsonb,
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dfm_copilot_insights_quote
  ON dfm_copilot_insights(quote_id);
CREATE INDEX IF NOT EXISTS idx_dfm_copilot_insights_org
  ON dfm_copilot_insights(org_id);
CREATE INDEX IF NOT EXISTS idx_dfm_copilot_insights_model
  ON dfm_copilot_insights(model_version);

ALTER TABLE dfm_copilot_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dfm_copilot_insights_select ON dfm_copilot_insights;
CREATE POLICY dfm_copilot_insights_select ON dfm_copilot_insights
  FOR SELECT
  USING (
    org_id::text = auth.jwt() ->> 'org_id'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS dfm_copilot_insights_insert ON dfm_copilot_insights;
CREATE POLICY dfm_copilot_insights_insert ON dfm_copilot_insights
  FOR INSERT
  WITH CHECK (
    org_id::text = auth.jwt() ->> 'org_id'
    OR auth.role() = 'service_role'
  );

COMMIT;
