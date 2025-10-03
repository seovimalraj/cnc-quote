/**
 * Step 18: Database Migration for Job Queue
 * Add file_hash column and job_events table
 */

-- Add file_hash column to uploads table for idempotency
ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

-- Index for fast lookup by hash
CREATE INDEX IF NOT EXISTS idx_uploads_file_hash ON uploads(file_hash);

-- Job events table for persistent progress tracking
CREATE TABLE IF NOT EXISTS job_events (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) NOT NULL,
  org_id VARCHAR(50) NOT NULL,
  job_type VARCHAR(50) NOT NULL, -- upload-parse, mesh-decimate, price-batch
  status VARCHAR(50) NOT NULL, -- queued, active, progress, completed, failed, stalled, retrying, cancelled
  progress INTEGER DEFAULT 0, -- 0-100
  message TEXT,
  meta JSONB,
  trace_id VARCHAR(100),
  error TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_job_events_job_id ON job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_events_org_id ON job_events(org_id);
CREATE INDEX IF NOT EXISTS idx_job_events_status ON job_events(status);
CREATE INDEX IF NOT EXISTS idx_job_events_created_at ON job_events(created_at);

-- Composite index for org + job lookup
CREATE INDEX IF NOT EXISTS idx_job_events_org_job ON job_events(org_id, job_id);

-- Add comment
COMMENT ON TABLE job_events IS 'Step 18: Persistent job progress events for resume after browser refresh';
COMMENT ON COLUMN job_events.job_id IS 'BullMQ job ID';
COMMENT ON COLUMN job_events.meta IS 'Job-specific metadata (e.g., quote_id, completed count)';
COMMENT ON COLUMN job_events.trace_id IS 'OpenTelemetry trace ID for distributed tracing';
