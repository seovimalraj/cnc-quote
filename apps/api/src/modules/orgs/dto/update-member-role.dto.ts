import { z } from 'zod';

export const UpdateMemberRoleDtoSchema = z.object({
  role: z.enum(['admin', 'engineer', 'buyer', 'viewer']),
});

export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleDtoSchema>;
