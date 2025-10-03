/**
 * Finish Chain Types (Frontend)
 */

export interface FinishOperation {
  id: string;
  code: string;
  name: string;
  process: string;
  description: string | null;
  prerequisites_json: string[];
  incompatibilities_json: string[];
  active: boolean;
}

export interface ChainStep {
  operation_code: string;
  operation_name: string;
  sequence: number;
  params: Record<string, any>;
  cost_cents?: number;
  lead_days?: number;
}

export interface FinishChain {
  quote_line_id: string;
  steps: ChainStep[];
  total_cost_cents: number;
  added_lead_days: number;
}

export interface ChainValidationError {
  code: string;
  message: string;
  operation_code?: string;
  sequence?: number;
}

export interface FinishChainCostBreakdown {
  steps: Array<{
    code: string;
    name: string;
    sequence: number;
    cost_cents: number;
    lead_days: number;
    params: Record<string, any>;
  }>;
  total_cost_cents: number;
  added_lead_days: number;
  computation_mode: 'add' | 'max' | 'serial';
}
