-- Extend quote status workflow and add lifecycle timestamps
BEGIN;

-- Update status constraint to include extended workflow states
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_status_check
  CHECK (status IN (
    'draft',
    'processing',
    'ready',
    'sent',
    'accepted',
    'rejected',
    'expired',
    'cancelled',
    'converted'
  ));

-- Add lifecycle timestamp columns and conversion linkage
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_order_id uuid REFERENCES orders(id);

-- Helpful indexes for timeline queries
CREATE INDEX IF NOT EXISTS quotes_processing_started_at_idx ON quotes(processing_started_at);
CREATE INDEX IF NOT EXISTS quotes_ready_at_idx ON quotes(ready_at);
CREATE INDEX IF NOT EXISTS quotes_sent_at_idx ON quotes(sent_at);
CREATE INDEX IF NOT EXISTS quotes_expired_at_idx ON quotes(expired_at);
CREATE INDEX IF NOT EXISTS quotes_cancelled_at_idx ON quotes(cancelled_at);
CREATE INDEX IF NOT EXISTS quotes_converted_at_idx ON quotes(converted_at);

COMMIT;
