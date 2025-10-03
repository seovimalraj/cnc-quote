BEGIN;

DO $$ BEGIN
  CREATE TYPE risk_severity AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.dfm_risk_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process TEXT NOT NULL,
  weights_json JSONB NOT NULL,
  thresholds_json JSONB NOT NULL,
  issue_catalog_json JSONB NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dfm_risk_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  quote_id UUID NOT NULL,
  line_id UUID NOT NULL,
  process TEXT NOT NULL,
  risk_vector JSONB NOT NULL,
  score NUMERIC(6,2) NOT NULL,
  severity risk_severity NOT NULL,
  issue_tags JSONB NOT NULL,
  material_code TEXT,
  features_ref UUID,
  config_version UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dfm_risk_results_by_ref ON public.dfm_risk_results (org_id, quote_id, line_id);
CREATE INDEX IF NOT EXISTS idx_dfm_risk_results_severity ON public.dfm_risk_results (severity);

-- Seed default config for cnc_milling if none exists
INSERT INTO public.dfm_risk_configs (process, weights_json, thresholds_json, issue_catalog_json)
SELECT 'cnc_milling',
       '{"thin_walls":0.35,"deep_pockets":0.2,"small_holes":0.15,"tight_tolerances":0.2,"material_hardness":0.1}'::jsonb,
       '{
          "severity_bands":[
            {"max_score":25,"severity":"LOW"},
            {"max_score":55,"severity":"MEDIUM"},
            {"max_score":80,"severity":"HIGH"},
            {"max_score":1000,"severity":"CRITICAL"}
          ],
          "thin_wall_mm":{"warning":1.5,"critical":0.8},
          "deep_pocket_ratio":{"warning":3.0,"critical":6.0},
          "small_hole_mm":{"warning":2.0,"critical":1.0},
          "tight_tolerance_mm":{"warning":0.05,"critical":0.02},
          "hardness_hb":{"warning":180,"critical":250}
        }'::jsonb,
       '[
          {"code":"THIN_WALL","title":"Thin wall detected","dfm_tip":"Increase wall to >= 1.5 mm or add ribs.","link":"/docs/dfm/thin-walls"},
          {"code":"DEEP_POCKET","title":"Deep pocket ratio high","dfm_tip":"Reduce depth or increase access radius; consider longer tool deflection.","link":"/docs/dfm/deep-pockets"},
          {"code":"SMALL_HOLE","title":"Small hole diameter","dfm_tip":"Drill pilot & ream; consider tolerance relaxation.","link":"/docs/dfm/small-holes"},
          {"code":"TIGHT_TOL","title":"Tight tolerance region","dfm_tip":"Relax to ±0.1 mm where possible.","link":"/docs/dfm/tolerances"},
          {"code":"HARD_MAT","title":"Hard material machining","dfm_tip":"Expect reduced feed rates and tool wear.","link":"/docs/dfm/materials"}
        ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.dfm_risk_configs c WHERE c.process = 'cnc_milling'
);

COMMIT;

