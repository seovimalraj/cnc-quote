import { z } from 'zod';

export const CadAnalysisVNextSchema = z
  .object({
    taskId: z.string(),
    fileId: z.string().optional(),
    quoteId: z.string().optional(),
    lineId: z.string().optional(),
    status: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    estimatedDuration: z.number().optional(),
    progress: z.number().optional(),
    message: z.string().optional(),
    result: z.record(z.string(), z.unknown()).optional(),
    metrics: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type CadAnalysisVNext = z.infer<typeof CadAnalysisVNextSchema>;