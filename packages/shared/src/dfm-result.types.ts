import { z } from 'zod';

// Lightweight DFM output (Phase 1) for pricing risk integration
export const DfmFindingSchema = z.object({
  code: z.string(),
  severity: z.enum(['info','warning','error']).default('info'),
  message: z.string(),
  suggestion: z.string().optional()
});

export const DfmLightResultSchema = z.object({
  risk_score: z.number().min(0).max(1).default(0),
  findings: z.array(DfmFindingSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type DfmFindingV1 = z.infer<typeof DfmFindingSchema>;
export type DfmLightResultV1 = z.infer<typeof DfmLightResultSchema>;
