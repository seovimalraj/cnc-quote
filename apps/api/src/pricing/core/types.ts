import type {
  ToleranceAffect,
  ToleranceAppliesTo,
  ToleranceFeatureType,
  ToleranceUnit,
} from '../repositories/tolerance-cost-book.repo';

export type ProcessType = 'cnc_milling' | 'turning' | 'sheet';

export interface PricingInput {
  orgId: string;
  partId: string;
  process: ProcessType;
  materialCode: string;
  quantity: number;
  finishes?: string[];
  tolerances?: Record<string, { value: number; unit: 'mm' | 'um' }>;
  toleranceProfile?: PricingToleranceProfile;
  toleranceEntries?: PricingToleranceEntry[];
  toleranceMatches?: PricingToleranceMatch[];
  toleranceSummary?: PricingToleranceSummary;
  toleranceCatalogVersion?: number;
  features?: Record<string, any>;
  region?: string;
  catalogVersion?: string;
  material?: PricingMaterialSnapshot;
}

export interface PricingMaterialSnapshot {
  id: string;
  code: string;
  name: string;
  densityKgM3: number;
  costPerKg: number;
  baseCostPerKg: number;
  regionMultiplier: number;
  leadTimeDays: number;
  source: 'catalog' | 'fallback';
}

export interface PricingBreakdownLine {
  key: string;
  label: string;
  amount: number;
  meta?: Record<string, any>;
}

export interface PricingContext {
  input: PricingInput;
  subtotalCost: number;
  price: number;
  timeMinutes: number;
  breakdown: PricingBreakdownLine[];
  logs: string[];
  flags: Record<string, boolean>;
}

export interface PricingFactor {
  name: string;
  stage: 'setup' | 'cost' | 'post_cost' | 'price';
  applies(ctx: PricingContext): boolean;
  compute(ctx: PricingContext): Promise<void> | void;
  order?: number;
}

export interface FactorRegistry {
  register(factor: PricingFactor): void;
  list(): PricingFactor[];
}

export interface PricingToleranceProfile {
  band: string;
  category: string;
  source: string;
  multipliers: {
    machining: number;
    setup: number;
    inspection: number;
  };
}

export type ToleranceSource = 'structured' | 'free_text' | 'iso_fit';

export interface PricingToleranceEntry {
  key: string;
  featureId?: string;
  featureType: ToleranceFeatureType;
  appliesTo: ToleranceAppliesTo | (string & Record<never, never>);
  unit: 'mm' | 'deg';
  value: number;
  rawValue: number;
  rawUnit: ToleranceUnit;
  source: ToleranceSource;
  reviewRequired?: boolean;
  fitCode?: string;
  notes?: string;
}

export interface PricingToleranceMatch {
  entryKey: string;
  featureType: ToleranceFeatureType;
  appliesTo: ToleranceAppliesTo;
  unit: 'mm' | 'deg';
  value: number;
  rawValue: number;
  rawUnit: ToleranceUnit;
  source: ToleranceSource;
  affects: ToleranceAffect[];
  multiplier: number;
  rowId: number;
  catalogVersion: number;
  reviewRequired?: boolean;
  fitCode?: string;
  notes?: string | null;
}

export interface PricingToleranceSummary {
  machineMultiplier: number;
  setupMultiplier: number;
  inspectionMultiplier: number;
  riskMultiplier: number;
  entryCount: number;
  tightestValueMm?: number;
  sources: Partial<Record<ToleranceSource, number>>;
  matchedRowIds: number[];
  reviewRequired: boolean;
  baseMultipliers?: {
    machining: number;
    setup: number;
    inspection: number;
  };
}
