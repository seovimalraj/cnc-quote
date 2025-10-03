import { PartConfigV1 } from './contracts/v1/part-config';

export type ProcessRecommendationFamily =
  | 'cnc_milling'
  | 'cnc_turning'
  | 'sheet_metal'
  | 'additive'
  | 'injection_molding'
  | 'casting';

export interface ProcessRecommendationAdjustment {
  process_code: string;
  delta: number;
  reason: string;
  caution?: boolean;
}

export interface ProcessRecommendationRuleTrace {
  rule_id: string;
  description: string;
  adjustments: ProcessRecommendationAdjustment[];
  triggered: boolean;
}

export interface ProcessRecommendationCandidate {
  process_code: string;
  process_family: ProcessRecommendationFamily;
  display_name: string;
  score: number;
  confidence: number;
  reasons: string[];
  cautions: string[];
  estimated_lead_time_class?: 'fast' | 'standard' | 'extended';
  estimated_cost_class?: 'lower' | 'comparable' | 'higher';
}

export interface ProcessRecommendationInputSummary {
  quantity: number;
  material: string | null;
  bounding_box_mm?: [number, number, number] | null;
  volume_cc?: number | null;
  surface_area_cm2?: number | null;
  source_part_config_id?: string;
  source_quote_id?: string;
  snapshot_at: string;
}

export interface ProcessRecommendationBundle {
  strategy: string;
  classifier_version?: string;
  primary: ProcessRecommendationCandidate | null;
  alternatives: ProcessRecommendationCandidate[];
  rule_trace: ProcessRecommendationRuleTrace[];
  input_summary?: ProcessRecommendationInputSummary;
  metadata?: {
    evaluation_ms: number;
    generated_at: string;
    part_config_ref?: Pick<PartConfigV1, 'id' | 'quote_id' | 'process_type' | 'selected_quantity'>;
  };
}

export interface ProcessRecommendationRequestPayload {
  part_config: PartConfigV1;
  geometry_data?: any;
  persist?: boolean;
}

export interface ProcessRecommendationResponse {
  recommendation: ProcessRecommendationBundle;
}
