BEGIN;

CREATE TABLE IF NOT EXISTS quote_compliance_daily_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_date date NOT NULL,
  code text NOT NULL,
  severity text NOT NULL,
  org_id uuid,
  quote_id uuid,
  event_count integer NOT NULL DEFAULT 0,
  quote_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_quote_compliance_daily_rollups_severity
    CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT uq_quote_compliance_daily_rollups
    UNIQUE (bucket_date, code, severity, org_id, quote_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_compliance_daily_rollups_bucket
  ON quote_compliance_daily_rollups(bucket_date);
CREATE INDEX IF NOT EXISTS idx_quote_compliance_daily_rollups_code
  ON quote_compliance_daily_rollups(code, severity);

DROP TRIGGER IF EXISTS trg_quote_compliance_daily_rollups_updated
  ON quote_compliance_daily_rollups;
CREATE TRIGGER trg_quote_compliance_daily_rollups_updated
  BEFORE UPDATE ON quote_compliance_daily_rollups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS quote_compliance_ml_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  quote_item_id uuid NOT NULL,
  org_id uuid,
  trace_id text,
  feature_flag_key text NOT NULL,
  model text NOT NULL,
  version int NOT NULL DEFAULT 1,
  rationale_text text NOT NULL,
  remediation_actions text[] NOT NULL DEFAULT '{}',
  alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  quote_snapshot jsonb,
  events jsonb,
  raw_response text,
  job_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_quote_compliance_ml_unique
    UNIQUE (quote_item_id, version, created_at)
);

CREATE INDEX IF NOT EXISTS idx_quote_compliance_ml_insights_quote
  ON quote_compliance_ml_insights(quote_id, quote_item_id);

DROP TRIGGER IF EXISTS trg_quote_compliance_ml_insights_updated
  ON quote_compliance_ml_insights;
CREATE TRIGGER trg_quote_compliance_ml_insights_updated
  BEFORE UPDATE ON quote_compliance_ml_insights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
