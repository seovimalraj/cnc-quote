CREATE TABLE IF NOT EXISTS tolerance_cost_book (
  id BIGSERIAL PRIMARY KEY,
  process TEXT NOT NULL CHECK (process IN ('cnc_milling','turning','sheet_metal','injection_molding')),
  feature_type TEXT NOT NULL CHECK (feature_type IN ('hole','slot','pocket','flatness','position','thread','profile')),
  tol_from NUMERIC NOT NULL,
  tol_to NUMERIC NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('mm','um','deg')),
  applies_to TEXT NOT NULL CHECK (applies_to IN ('diameter','width','depth','runout','flatness','true_position','pitch','generic')),
  multiplier NUMERIC NOT NULL CHECK (multiplier >= 0.8 AND multiplier <= 5.0),
  affects TEXT[] NOT NULL DEFAULT ARRAY['machine_time','setup_time'],
  notes TEXT DEFAULT NULL,
  catalog_version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tol_cost_book_lookup
  ON tolerance_cost_book(process, feature_type, unit_type, applies_to, tol_from, tol_to)
  WHERE active = TRUE;
