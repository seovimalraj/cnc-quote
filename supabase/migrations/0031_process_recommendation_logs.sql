-- id: 2025-09-30_process_recommendation_logs
-- Stores rule-based process recommendation runs for analytics and auditing

BEGIN;

CREATE TABLE IF NOT EXISTS public.process_recommendation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  quote_id uuid NOT NULL,
  line_id uuid NOT NULL,
  primary_process_code text NOT NULL,
  primary_process_family text NOT NULL,
  strategy text NOT NULL DEFAULT 'rules_v0',
  classifier_version text,
  confidence numeric(6,4),
  recommendations jsonb NOT NULL,
  rule_trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS process_reco_logs_org_quote_line_idx
  ON public.process_recommendation_logs (org_id, quote_id, line_id);

CREATE INDEX IF NOT EXISTS process_reco_logs_created_idx
  ON public.process_recommendation_logs (created_at DESC);

ALTER TABLE public.process_recommendation_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'process_recommendation_logs'
      AND policyname = 'process_reco_logs_read_org'
  ) THEN
    CREATE POLICY process_reco_logs_read_org ON public.process_recommendation_logs
      FOR SELECT USING (
        current_setting('app.current_org', true) IS NOT NULL
        AND org_id = current_setting('app.current_org', true)::uuid
      );
  END IF;
END $$;

COMMIT;
