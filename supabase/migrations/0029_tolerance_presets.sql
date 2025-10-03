CREATE TABLE IF NOT EXISTS tolerance_presets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  process TEXT NOT NULL,
  feature_type TEXT NOT NULL,
  applies_to TEXT NOT NULL,
  default_tol NUMERIC NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('mm','um','deg')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
