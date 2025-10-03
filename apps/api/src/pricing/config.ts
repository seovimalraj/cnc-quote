import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { PricingConfig } from './types';

// Zod schema for pricing config validation
const PricingConfigSchema = z.object({
  currencyRates: z.record(z.string(), z.number()),
  materialBase: z.record(z.string(), z.object({
    pricePerCm3: z.number(),
  })),
  machine: z.record(z.string(), z.object({
    setupMin: z.number(),
    runMinPerCm3: z.number(),
    hourlyRate: z.number(),
  })),
  finish: z.record(z.string(), z.object({
    addPct: z.number(),
    minFee: z.number(),
    leadTimeDays: z.number(),
  })),
  risk: z.object({
    upliftPctPerPoint: z.number(),
    capPct: z.number(),
  }),
  quantity: z.object({
    breaks: z.array(z.number()),
    discountPct: z.array(z.number()),
  }),
  leadTime: z.record(z.string(), z.object({
    multiplier: z.number(),
    baseDays: z.number(),
  })),
});

// Load config from JSON file
export function loadPricingConfig(configPath?: string): PricingConfig {
  const path = configPath || join(__dirname, 'defaults.json');
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  return PricingConfigSchema.parse(raw);
}

// Validate config (throws if invalid)
export function validatePricingConfig(config: unknown): PricingConfig {
  return PricingConfigSchema.parse(config);
}