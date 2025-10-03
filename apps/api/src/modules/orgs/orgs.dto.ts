import { z } from 'zod';

export const CreateOrgDtoSchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
});

export const UpdateOrgDtoSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().optional(),
});

export type CreateOrgDto = z.infer<typeof CreateOrgDtoSchema>;
export type UpdateOrgDto = z.infer<typeof UpdateOrgDtoSchema>;