BEGIN;

CREATE TABLE IF NOT EXISTS public.process_recommendation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  quote_id UUID NOT NULL,
  part_id UUID NOT NULL,
  request_json JSONB NOT NULL,
  response_json JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_reco_logs_org_quote
  ON public.process_recommendation_logs (org_id, quote_id);

CREATE INDEX IF NOT EXISTS idx_process_reco_logs_created_at
  ON public.process_recommendation_logs (created_at DESC);

COMMIT;
