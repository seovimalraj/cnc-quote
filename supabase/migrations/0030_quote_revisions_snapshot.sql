BEGIN;

ALTER TABLE quote_revisions
  ADD COLUMN IF NOT EXISTS state_snapshot jsonb;

CREATE INDEX IF NOT EXISTS quote_revisions_snapshot_quote_idx
  ON quote_revisions(quote_id)
  WHERE state_snapshot IS NOT NULL;

COMMIT;
