import { z } from 'zod';

/**
 * @module contracts/vnext/invites
 * @ownership platform-identity
 * Defines cross-service contract for organisation invite introspection.
 */
export const OrgInviteRoleSchema = z.enum(['admin', 'engineer', 'buyer', 'viewer']);

export const OrgInviteStatusSchema = z.enum(['pending', 'accepted', 'expired']);

export const OrgSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export const OrgInviteInviterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export const OrgInviteDetailsSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  role: OrgInviteRoleSchema,
  organization: OrgSummarySchema,
  invitedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
  inviter: OrgInviteInviterSchema.nullable(),
  status: OrgInviteStatusSchema,
  canAccept: z.boolean(),
});

export type OrgInviteRole = z.infer<typeof OrgInviteRoleSchema>;
export type OrgInviteStatus = z.infer<typeof OrgInviteStatusSchema>;
export type OrgSummary = z.infer<typeof OrgSummarySchema>;
export type OrgInviteInviter = z.infer<typeof OrgInviteInviterSchema>;
export type OrgInviteDetails = z.infer<typeof OrgInviteDetailsSchema>;
