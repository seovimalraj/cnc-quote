import { z } from 'zod';

// Process codes supported (aligned with shared catalog)
export type ProcessCode =
  | 'CNC-MILL-3AX' | 'CNC-MILL-4AX' | 'CNC-MILL-5AX'
  | 'CNC-TURN-2AX' | 'CNC-TURN-MULTI'
  | 'SHEET-LASER' | 'SHEET-PUNCH' | 'SHEET-BEND'
  | 'INJ-MOLD-AL' | 'INJ-MOLD-STEEL'
  | 'CAST-SAND' | 'CAST-INVESTMENT' | 'CAST-DIE'
  | '3DP-FDM' | '3DP-SLA' | '3DP-SLS'
  | 'URETHANE-CAST';

// Currency support
export type Currency = 'USD' | 'EUR' | 'INR';

// Lead time classes
export type LeadTimeClass = 'economy' | 'standard' | 'express';

// Quote configuration - normalized input to pricing
export const QuoteConfigSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  processCode: z.enum(['CNC-MILL-3AX', 'CNC-MILL-4AX', 'CNC-MILL-5AX', 'CNC-TURN-2AX', 'CNC-TURN-MULTI', 'SHEET-LASER', 'SHEET-PUNCH', 'SHEET-BEND', 'INJ-MOLD-AL', 'INJ-MOLD-STEEL', 'CAST-SAND', 'CAST-INVESTMENT', 'CAST-DIE', '3DP-FDM', '3DP-SLA', '3DP-SLS', 'URETHANE-CAST']),
  materialCode: z.string(),
  quantity: z.number().int().positive(),
  geometry: z.object({
    volume_mm3: z.number().positive(),
    area_mm2: z.number().positive(),
    bbox_mm: z.tuple([z.number(), z.number(), z.number()]),
    features: z.record(z.string(), z.unknown()).optional(), // Placeholder for extracted features
  }),
  tolerance: z.object({
    band_um: z.number().positive(),
    featureCategory: z.string().optional(),
  }).optional(),
  finishes: z.array(z.string()).optional(),
  leadClass: z.enum(['economy', 'standard', 'express']).optional(),
  region: z.string().optional(),
  risk: z.object({
    dfm_risk_score: z.number().min(0).max(1).optional(),
  }).optional(),
  currency: z.enum(['USD', 'EUR', 'INR']).default('USD'),
});

export type QuoteConfig = z.infer<typeof QuoteConfigSchema>;

// Price breakdown item
export interface PriceBreakdownItem {
  code: string;
  label: string;
  amount: number;
  meta?: Record<string, unknown>;
}

// Pricing result
export interface PricingResult {
  subtotal: number;
  total: number;
  currency: Currency;
  breakdown: PriceBreakdownItem[];
  trace: TraceEntry[];
  timings_ms?: Record<string, number>;
  version: string;
  inputHash?: string;
  cacheHit?: boolean;
  cacheKey?: string;
}

// Trace entry for explainability
export interface TraceEntry {
  at: string; // ISO timestamp
  factor: string; // factor code
  inputHash: string; // hash of factor inputs
  output: Record<string, unknown>; // factor outputs
  note?: string; // optional explanation
}

// Factor context
export interface FactorCtx {
  cfg: QuoteConfig;
  config: PricingConfig;
  runningSubtotal?: number; // For factors that need to know current total
}

// Factor contract
export interface Factor {
  code: string;
  run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: TraceEntry[] }>;
}

// Pricing configuration
export interface PricingConfig {
  currencyRates: Record<string, number>; // e.g., { 'EUR': 0.85, 'INR': 83.0 }
  materialBase: Record<string, { pricePerCm3: number }>;
  machine: Record<string, {
    setupMin: number;
    runMinPerCm3: number;
    hourlyRate: number;
  }>;
  finish: Record<string, {
    addPct: number;
    minFee: number;
    leadTimeDays: number;
  }>;
  risk: {
    upliftPctPerPoint: number; // e.g., 0.02 for 2% per risk point
    capPct: number; // e.g., 0.25 for 25% max uplift
  };
  quantity: {
    breaks: number[]; // e.g., [1, 10, 100, 1000]
    discountPct: number[]; // e.g., [0, 0.05, 0.10, 0.15]
  };
  leadTime: Record<LeadTimeClass, {
    multiplier: number;
    baseDays: number;
  }>;
}

export interface PricingCacheAdapter {
  get(key: string): Promise<PricingResult | undefined>;
  set(key: string, value: PricingResult, ttlSeconds?: number): Promise<void>;
}
