/**
 * Finish Operations Module Types
 * Step 11: Finish operation chain model with cost/lead calculations
 */

import { ContractsV1 } from '@cnc-quote/shared';

export interface FinishOperation {
  id: string;
  code: string;
  name: string;
  process: ContractsV1.ProcessType;
  description: string | null;
  cost_formula: string;
  lead_days_formula: string;
  prerequisites_json: string[];
  incompatibilities_json: string[];
  qos_json: QosConfig;
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QosConfig {
  mode: 'add' | 'max' | 'serial';
  parallel_compatible: boolean;
  batch_discount_threshold?: number;
}

export interface ChainStep {
  operation_id: string;
  operation_code: string;
  operation_name: string;
  sequence: number;
  params: Record<string, any>;
  cost_cents?: number;
  lead_days?: number;
  notes?: string;
}

export interface FinishChain {
  quote_line_id: string;
  steps: ChainStep[];
  total_cost_cents: number;
  added_lead_days: number;
}

export interface ChainValidationResult {
  valid: boolean;
  errors: ChainValidationError[];
}

export interface ChainValidationError {
  code: 'FINISH_PREREQ_MISSING' | 'FINISH_INCOMPATIBLE' | 'FINISH_INVALID_SEQUENCE' | 'FINISH_UNSAFE_FORMULA' | 'FINISH_OPERATION_NOT_FOUND' | 'FINISH_OPERATION_INACTIVE';
  message: string;
  operation_code?: string;
  sequence?: number;
  details?: Record<string, any>;
}

export interface FormulaContext {
  area_m2: number;
  sa: number; // alias for area_m2
  volume_cm3: number;
  v_cm3: number; // alias
  qty: number;
  material: string;
  region: string;
  color?: string;
  finish_grade?: string;
  setup_minutes?: number;
  run_minutes_per_part?: number;
  batch_size?: number;
  part_class?: string;
  [key: string]: any;
}

export interface ChainCostBreakdown {
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
