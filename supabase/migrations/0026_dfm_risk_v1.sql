-- id: 2025-09-29_create_dfm_risk_tables
-- Structured risk scoring support for DFM

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_severity') THEN
    CREATE TYPE risk_severity AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.dfm_risk_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process text NOT NULL,
  weights_json jsonb NOT NULL,
  thresholds_json jsonb NOT NULL,
  issue_catalog_json jsonb NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process, effective_at)
);

CREATE TABLE IF NOT EXISTS public.dfm_risk_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  quote_id uuid NOT NULL,
  line_id uuid NOT NULL,
  process text NOT NULL,
  risk_vector jsonb NOT NULL,
  score numeric(6,2) NOT NULL,
  severity risk_severity NOT NULL,
  issue_tags jsonb NOT NULL,
  material_code text,
  features_ref uuid,
  config_version uuid REFERENCES public.dfm_risk_configs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dfm_risk_results_org_quote_line_idx ON public.dfm_risk_results (org_id, quote_id, line_id);
CREATE INDEX IF NOT EXISTS dfm_risk_results_severity_idx ON public.dfm_risk_results (severity);
CREATE INDEX IF NOT EXISTS dfm_risk_results_created_idx ON public.dfm_risk_results (created_at DESC);

-- Seed baseline configuration for CNC milling if not present
INSERT INTO public.dfm_risk_configs (process, weights_json, thresholds_json, issue_catalog_json)
SELECT
  'cnc_milling',
  '{"thin_walls":0.35,"deep_pockets":0.2,"small_holes":0.15,"tight_tolerances":0.2,"material_hardness":0.1}',
  '{"severity_bands":[{"max_score":25,"severity":"LOW"},{"max_score":55,"severity":"MEDIUM"},{"max_score":80,"severity":"HIGH"},{"max_score":1000,"severity":"CRITICAL"}],"thin_wall_mm":{"warning":1.5,"critical":0.8},"deep_pocket_ratio":{"warning":3.0,"critical":6.0},"small_hole_mm":{"warning":2.0,"critical":1.0},"tight_tolerance_mm":{"warning":0.05,"critical":0.02},"hardness_hb":{"warning":180,"critical":250}}',
  '[{"code":"THIN_WALL","title":"Thin wall detected","dfm_tip":"Increase wall to >= 1.5 mm or add ribs.","link":"/docs/dfm/thin-walls"},{"code":"DEEP_POCKET","title":"Deep pocket ratio high","dfm_tip":"Reduce depth or increase access radius; consider longer tool deflection.","link":"/docs/dfm/deep-pockets"},{"code":"SMALL_HOLE","title":"Small hole diameter","dfm_tip":"Drill pilot & ream; consider tolerance relaxation.","link":"/docs/dfm/small-holes"},{"code":"TIGHT_TOL","title":"Tight tolerance region","dfm_tip":"Relax to ±0.1 mm where possible.","link":"/docs/dfm/tolerances"},{"code":"HARD_MAT","title":"Hard material machining","dfm_tip":"Expect reduced feed rates and tool wear.","link":"/docs/dfm/materials"}]'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dfm_risk_configs
  WHERE process = 'cnc_milling'
);

-- Enable RLS and policies to keep results scoped per org
ALTER TABLE public.dfm_risk_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dfm_risk_results'
      AND policyname = 'dfm_risk_results_read_org'
  ) THEN
    CREATE POLICY dfm_risk_results_read_org ON public.dfm_risk_results
      FOR SELECT USING (
        current_setting('app.current_org', true) IS NOT NULL
        AND org_id = current_setting('app.current_org', true)::uuid
      );
  END IF;
END $$;

COMMIT;
