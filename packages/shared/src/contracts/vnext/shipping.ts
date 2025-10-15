import { z } from 'zod';

export const ShippingRateVNextSchema = z
  .object({
    id: z.string(),
    carrier: z.string(),
    service: z.string(),
    cost_estimate: z.number(),
    currency: z.string().optional(),
    eta: z.string().optional(),
    business_days: z.number().optional(),
    lead_days: z.number().optional(),
    expires_at: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const ShippingRatesVNextSchema = z
  .object({
    rates: z.array(ShippingRateVNextSchema),
    generatedAt: z.string().optional(),
  })
  .passthrough();

export type ShippingRateVNext = z.infer<typeof ShippingRateVNextSchema>;
export type ShippingRatesVNext = z.infer<typeof ShippingRatesVNextSchema>;