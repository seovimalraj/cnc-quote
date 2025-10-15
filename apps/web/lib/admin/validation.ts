import { z } from 'zod';

export const laneZ = z.enum(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED']);

export const priorityZ = z.enum(['LOW', 'MED', 'HIGH', 'EXPEDITE']);

export const listQueryZ = z
  .object({
    lane: z.union([laneZ, z.array(laneZ)]).optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    assignee: z.union([z.string(), z.array(z.string())]).optional(),
    priority: z.union([priorityZ, z.array(priorityZ)]).optional(),
    hasDFM: z.coerce.boolean().optional(),
    search: z.string().max(128).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    minValue: z.coerce.number().min(0).optional(),
    maxValue: z.coerce.number().min(0).optional(),
    sort: z.enum(['createdAt', 'totalValue', 'dfmFindingCount', 'priority', 'lastActionAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    limit: z.coerce.number().min(1).max(100).default(25),
    cursor: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.minValue !== undefined && data.maxValue !== undefined) {
        return data.minValue <= data.maxValue;
      }
      return true;
    },
    {
      message: 'minValue must be <= maxValue',
      path: ['minValue'],
    },
  );

export type ReviewListQuery = z.infer<typeof listQueryZ>;
