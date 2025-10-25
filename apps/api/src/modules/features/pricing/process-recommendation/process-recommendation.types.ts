import { ContractsV1 } from '@cnc-quote/shared';

type PartConfigV1 = ContractsV1.PartConfigV1;

export interface NormalizedBoundingBox {
  length: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
}

export interface NormalizedFeatureMetrics {
  holes: number;
  pockets: number;
  threads: number;
  bosses: number;
  bends: number;
  thinWalls: number;
  undercuts: number;
  total: number | null;
  complexityScore: number | null;
}

export interface NormalizedSheetMetrics {
  thicknessMm: number | null;
  flatAreaCm2: number | null;
  cutLengthMm: number | null;
  bendCount: number | null;
  nestUtilization: number | null;
}

export interface NormalizedPartMetrics {
  volumeCc: number | null;
  surfaceAreaCm2: number | null;
  bbox: NormalizedBoundingBox;
  features: NormalizedFeatureMetrics;
  sheet: NormalizedSheetMetrics;
}

export interface ProcessRuleContext {
  partConfig: PartConfigV1;
  quantity: number;
  materialCode: string | null;
  finishIds: string[];
  toleranceClass?: string;
  metrics: NormalizedPartMetrics;
  dfmIssues: PartConfigV1['dfm']['issues'];
  geometryFlags: string[];
}

export type RuleAdjuster = (
  processCode: string,
  delta: number,
  reason: string,
  options?: { caution?: boolean }
) => void;

export interface ProcessRule {
  id: string;
  description: string;
  evaluate(context: ProcessRuleContext, adjust: RuleAdjuster): void;
}
