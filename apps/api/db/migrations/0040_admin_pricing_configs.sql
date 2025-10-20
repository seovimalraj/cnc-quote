-- Admin pricing configuration snapshots
CREATE TYPE admin_pricing_config_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE admin_pricing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  status admin_pricing_config_status NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_by UUID,
  published_at TIMESTAMPTZ,
  published_by UUID,
  notes TEXT
);

CREATE INDEX admin_pricing_configs_status_idx ON admin_pricing_configs(status);
CREATE INDEX admin_pricing_configs_updated_at_idx ON admin_pricing_configs(updated_at DESC);
