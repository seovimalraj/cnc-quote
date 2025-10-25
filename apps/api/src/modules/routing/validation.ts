/**
 * Request Validation Schemas (Step 10)
 */

import { z } from 'zod';

export const RecommendRequestSchema = z.object({
  quote_id: z.string().uuid(),
  part_id: z.string().uuid(),
  override: z
    .object({
      material_code: z.string().optional(),
      quantity: z.number().int().positive().optional(),
      requested_process: z.enum(['cnc_milling', 'turning', 'sheet_metal', 'injection_molding', 'additive']).optional(),
    })
    .optional(),
});

export type RecommendRequestDTO = z.infer<typeof RecommendRequestSchema>;
