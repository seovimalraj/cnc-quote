import { z } from 'zod';

export const CreateOrgDtoSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export type CreateOrgDto = z.infer<typeof CreateOrgDtoSchema>;
