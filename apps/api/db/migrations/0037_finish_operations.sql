-- Step 11: Finish Operation Chain Model
-- Migration: 2025_10_01_001_create_finish_tables

BEGIN;

-- Finish operations catalog
CREATE TABLE IF NOT EXISTS public.finish_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  process TEXT NOT NULL, -- 'cnc', 'sheet', 'turning', 'mim', 'im', 'printing', 'casting'
  description TEXT,
  cost_formula TEXT NOT NULL, -- DSL expression for cost calculation
  lead_days_formula TEXT NOT NULL, -- DSL expression for lead time
  prerequisites_json JSONB DEFAULT '[]'::jsonb, -- array of prerequisite operation codes
  incompatibilities_json JSONB DEFAULT '[]'::jsonb, -- array of incompatible operation codes
  qos_json JSONB DEFAULT '{}'::jsonb, -- quality of service metadata (e.g., mode: 'sum'|'max'|'serial')
  version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finish_ops_process ON public.finish_operations(process) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_finish_ops_code ON public.finish_operations(code) WHERE active = TRUE;

-- Quote line finish chain associations
CREATE TABLE IF NOT EXISTS public.quote_line_finish_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_line_id UUID NOT NULL,
  operation_id UUID NOT NULL REFERENCES public.finish_operations(id) ON DELETE RESTRICT,
  sequence INT NOT NULL CHECK (sequence >= 1),
  params_json JSONB DEFAULT '{}'::jsonb, -- operation-specific parameters (color, grade, etc.)
  cost_cents INT NOT NULL DEFAULT 0, -- computed cost for this step
  lead_days NUMERIC(6,2) NOT NULL DEFAULT 0, -- computed lead time for this step
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS qlfc_line_seq_uidx ON public.quote_line_finish_chain(quote_line_id, sequence);
CREATE INDEX IF NOT EXISTS qlfc_line_idx ON public.quote_line_finish_chain(quote_line_id);
CREATE INDEX IF NOT EXISTS qlfc_operation_idx ON public.quote_line_finish_chain(operation_id);

-- Add updated_at trigger for finish_operations
CREATE OR REPLACE FUNCTION update_finish_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER finish_operations_updated_at_trigger
BEFORE UPDATE ON public.finish_operations
FOR EACH ROW
EXECUTE FUNCTION update_finish_operations_updated_at();

-- Add updated_at trigger for quote_line_finish_chain
CREATE OR REPLACE FUNCTION update_quote_line_finish_chain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quote_line_finish_chain_updated_at_trigger
BEFORE UPDATE ON public.quote_line_finish_chain
FOR EACH ROW
EXECUTE FUNCTION update_quote_line_finish_chain_updated_at();

COMMIT;
