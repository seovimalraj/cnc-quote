-- Add pricing_version to quote_items and subtotal to quotes if they do not exist
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS pricing_version BIGINT DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;

-- Index to fetch items by quote quickly for subtotal recompute
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);