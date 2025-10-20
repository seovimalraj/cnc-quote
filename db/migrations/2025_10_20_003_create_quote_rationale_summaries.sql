BEGIN;

CREATE TABLE IF NOT EXISTS quote_rationale_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  quote_revision_id uuid REFERENCES quote_revisions(id) ON DELETE SET NULL,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  pricing_version bigint NOT NULL CHECK (pricing_version > 0),
  cost_sheet_hash text NOT NULL CHECK (char_length(cost_sheet_hash) BETWEEN 16 AND 128),
  cost_sheet jsonb NOT NULL CHECK (jsonb_typeof(cost_sheet) = 'object'),
  summary_text text NOT NULL CHECK (length(summary_text) > 0),
  breakdown_highlights jsonb NOT NULL CHECK (jsonb_typeof(breakdown_highlights) = 'array'),
  model_version text NOT NULL CHECK (length(model_version) > 0),
  trace_id text,
  feature_flag_key text NOT NULL DEFAULT 'pricing_quote_rationale',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_rationale_unique_cost
  ON quote_rationale_summaries(quote_id, cost_sheet_hash);

CREATE INDEX IF NOT EXISTS idx_quote_rationale_org
  ON quote_rationale_summaries(org_id);

CREATE INDEX IF NOT EXISTS idx_quote_rationale_revision
  ON quote_rationale_summaries(quote_revision_id);

ALTER TABLE quote_rationale_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_rationale_select ON quote_rationale_summaries;
CREATE POLICY quote_rationale_select ON quote_rationale_summaries
  FOR SELECT
  USING (
    org_id::text = auth.jwt() ->> 'org_id'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS quote_rationale_insert ON quote_rationale_summaries;
CREATE POLICY quote_rationale_insert ON quote_rationale_summaries
  FOR INSERT
  WITH CHECK (
    org_id::text = auth.jwt() ->> 'org_id'
    OR auth.role() = 'service_role'
  );

COMMIT;
