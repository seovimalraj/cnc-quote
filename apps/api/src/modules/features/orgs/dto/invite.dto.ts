import { z } from 'zod';

export const InviteDtoSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'engineer', 'buyer', 'viewer']),
});

export type InviteDto = z.infer<typeof InviteDtoSchema>;
