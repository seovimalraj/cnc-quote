BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE material_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE material_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES material_categories(id) ON DELETE RESTRICT,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  standard text,
  composition_json jsonb DEFAULT '{}'::jsonb,
  processes text[] DEFAULT '{}'::text[],
  available_regions text[] DEFAULT '{}'::text[],
  density_kg_m3 numeric CHECK (density_kg_m3 > 0),
  machinability_index int CHECK (machinability_index BETWEEN 0 AND 100),
  hardness_hb numeric,
  tensile_mpa numeric,
  melting_c numeric,
  cost_per_kg_base numeric CHECK (cost_per_kg_base >= 0),
  supplier_ref text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE material_region_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES material_properties(id) ON DELETE CASCADE,
  region text NOT NULL,
  multiplier numeric CHECK (multiplier > 0),
  UNIQUE(material_id, region)
);

CREATE TABLE material_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES material_properties(id) ON DELETE CASCADE,
  alias text NOT NULL,
  UNIQUE(material_id, alias)
);

CREATE INDEX idx_material_properties_name_trgm ON material_properties USING gin (name gin_trgm_ops);
CREATE INDEX idx_material_properties_code ON material_properties(code);

ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES material_properties(id);
ALTER TABLE pricing_cache ADD COLUMN IF NOT EXISTS catalog_version int DEFAULT 1;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_material_properties_updated ON material_properties;
CREATE TRIGGER trg_material_properties_updated
BEFORE UPDATE ON material_properties
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
