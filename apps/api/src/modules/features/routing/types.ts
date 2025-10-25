/**
 * Process Recommendation Types (Step 10)
 * Exact contracts from specification
 */

export type ProcessType = 'cnc_milling' | 'turning' | 'sheet_metal' | 'injection_molding' | 'additive';

export interface GeometryFeatures {
  bbox: { x: number; y: number; z: number };
  volume_mm3: number;
  surface_area_mm2: number;
  min_wall_thickness_mm: number | null;
  cylindricity_hint: boolean;
  rotational_symmetry_axis: 'X' | 'Y' | 'Z' | null;
  sheet_like_hint: {
    is_sheet_like: boolean;
    thickness_mm: number;
    planar_faces_pct: number;
  };
  holes: Array<{
    type: 'through' | 'blind';
    dia_mm: number;
    depth_mm: number;
    count: number;
  }>;
  pockets: Array<{
    depth_mm: number;
    aspect: number;
    count: number;
  }>;
  threads_hint: boolean;
  undercuts_present?: boolean;
}

export interface QuoteConfig {
  requested_process: string | null;
  material_code: string;
  tolerances?: Record<string, any>;
  sheet_thickness_mm?: number;
  quantity: number;
}

export interface RecommendRequest {
  quote_id: string;
  part_id: string;
  override?: {
    material_code?: string;
    quantity?: number;
    requested_process?: ProcessType;
  };
}

export interface ProcessRecommendation {
  process: ProcessType;
  confidence: number;
  reasons: string[];
  decision_vector: {
    rules_fired: string[];
    scores: {
      geometry_fit: number;
      feature_match: number;
      constraint_penalty: number;
      user_intent_bonus: number;
    };
  };
  blocking_constraints: string[];
  metadata: {
    suggested_setups?: number;
    orientation_hint?: string;
    notes?: string;
  };
}

export interface ProcessRecommendationResponse {
  recommendations: ProcessRecommendation[];
  version: string;
  generated_at: string;
}

export interface RecommendCtx {
  features: GeometryFeatures;
  config: QuoteConfig;
}

export interface RuleResult {
  process: ProcessType;
  geometry_fit?: number;
  feature_match?: number;
  user_intent_bonus?: number;
  constraint_penalty?: number;
  reasons?: string[];
  blocking_constraints?: string[];
}

export interface ProcessRule {
  id: string;
  if: (ctx: RecommendCtx) => boolean;
  then: RuleResult;
}
