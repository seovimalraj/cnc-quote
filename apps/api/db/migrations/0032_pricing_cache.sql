CREATE TABLE IF NOT EXISTS pricing_cache (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  hash TEXT NOT NULL,
  version TEXT NOT NULL,
  request_json JSONB NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  size_bytes INTEGER,
  compression TEXT DEFAULT 'gzip',
  UNIQUE(org_id, hash, version)
);

CREATE INDEX IF NOT EXISTS idx_pricing_cache_ttl ON pricing_cache(ttl_at);
CREATE INDEX IF NOT EXISTS idx_pricing_cache_org ON pricing_cache(org_id);

CREATE OR REPLACE FUNCTION pricing_cache_record_hit(
  cache_id BIGINT,
  ttl_at_param TIMESTAMPTZ DEFAULT NULL,
  now_param TIMESTAMPTZ DEFAULT now()
) RETURNS VOID AS $$
BEGIN
  UPDATE pricing_cache
  SET
    hit_count = hit_count + 1,
    last_hit_at = now_param,
    ttl_at = COALESCE(ttl_at_param, ttl_at)
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;
