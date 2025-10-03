-- Migration: add JSONB fields for PartConfigV1 persistence
-- Apply in Supabase / Postgres

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS config_json JSONB;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS pricing_matrix JSONB;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS dfm_json JSONB;

-- Optional indexes for querying pricing / dfm status quickly
CREATE INDEX IF NOT EXISTS idx_quote_items_config_json ON quote_items USING GIN (config_json);
CREATE INDEX IF NOT EXISTS idx_quote_items_pricing_matrix ON quote_items USING GIN (pricing_matrix);
CREATE INDEX IF NOT EXISTS idx_quote_items_dfm_json ON quote_items USING GIN (dfm_json);
