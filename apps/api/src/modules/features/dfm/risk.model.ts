export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskDimension = keyof RiskVector;

export interface RiskVector {
  thin_walls: number;
  deep_pockets: number;
  small_holes: number;
  tight_tolerances: number;
  material_hardness: number;
}

export interface IssueTag {
  code: string;
  title: string;
  severity: RiskSeverity;
  faceIds?: number[];
  dfmTip?: string;
  link?: string;
  dimension?: RiskDimension;
}

export interface RiskContribution {
  dimension: RiskDimension;
  weight: number;
  value: number;
  scoreComponent: number;
}

export interface RiskResult {
  score: number;
  severity: RiskSeverity;
  vector: RiskVector;
  tags: IssueTag[];
  contributions: RiskContribution[];
}

export interface RiskPricingEffect {
  risk_markup: number;
  severity: RiskSeverity;
  contributions: RiskContribution[];
}

export const RISK_SEVERITY_MARKUP: Record<RiskSeverity, number> = {
  LOW: 0,
  MEDIUM: 0.05,
  HIGH: 0.1,
  CRITICAL: 0.18,
};

export const RISK_DIMENSIONS: ReadonlyArray<RiskDimension> = [
  'thin_walls',
  'deep_pockets',
  'small_holes',
  'tight_tolerances',
  'material_hardness',
] as const;

export interface RiskComputeInput {
  orgId: string;
  quoteId: string;
  lineId: string;
  process: string;
  geometryId: string;
  materialCode?: string;
  tolerances?: Array<{ feature?: string; id?: string; value_mm: number }>;
}

export interface RiskConfigRecord {
  id: string;
  process: string;
  weights_json: Record<string, number>;
  thresholds_json: Record<string, any>;
  issue_catalog_json: Array<Record<string, any>>;
  effective_at: string;
}

export interface PersistedRiskResult {
  id: string;
  org_id: string;
  quote_id: string;
  line_id: string;
  process: string;
  risk_vector: RiskVector;
  score: number;
  severity: RiskSeverity;
  issue_tags: IssueTag[];
  material_code?: string;
  features_ref?: string;
  config_version?: string;
  created_at: string;
}

