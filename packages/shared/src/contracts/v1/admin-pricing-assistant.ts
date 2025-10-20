import { z } from 'zod';
import { AdminPricingConfigSchema } from '../../admin-pricing.types';

export const AdminPricingRevisionAssistantRequestSchemaV1 = z.object({
  version: z.literal(1),
  instructions: z.string().min(1).max(2000),
  focusAreas: z.array(z.string().min(1).max(64)).max(8).optional(),
});

export type AdminPricingRevisionAssistantRequestV1 = z.infer<typeof AdminPricingRevisionAssistantRequestSchemaV1>;

export const AdminPricingRevisionAssistantAdjustmentSchemaV1 = z.object({
  path: z.string().min(5).max(256),
  type: z.enum(['set', 'add', 'multiply']),
  value: z.number(),
  reason: z.string().min(1).max(512),
  beforeValue: z.number().optional(),
  afterValue: z.number().optional(),
});

export type AdminPricingRevisionAssistantAdjustmentV1 = z.infer<typeof AdminPricingRevisionAssistantAdjustmentSchemaV1>;

export const AdminPricingRevisionAssistantLLMResponseSchemaV1 = z.object({
  targetVersion: z.string().max(64).optional(),
  notes: z.string().max(2000).optional(),
  adjustments: z.array(AdminPricingRevisionAssistantAdjustmentSchemaV1).max(50),
});

export type AdminPricingRevisionAssistantLLMResponseV1 = z.infer<typeof AdminPricingRevisionAssistantLLMResponseSchemaV1>;

export const AdminPricingRevisionAssistantStatusSchemaV1 = z.enum([
  'queued',
  'processing',
  'succeeded',
  'failed',
]);

export type AdminPricingRevisionAssistantStatusV1 = z.infer<typeof AdminPricingRevisionAssistantStatusSchemaV1>;

export const AdminPricingRevisionAssistantApprovalDecisionSchemaV1 = z.enum(['approved', 'rejected']);

export type AdminPricingRevisionAssistantApprovalDecisionV1 = z.infer<
  typeof AdminPricingRevisionAssistantApprovalDecisionSchemaV1
>;

export const AdminPricingRevisionDualControlStateSchemaV1 = z.enum([
  'pending',
  'approved',
  'rejected',
  'not_required',
]);

export type AdminPricingRevisionDualControlStateV1 = z.infer<
  typeof AdminPricingRevisionDualControlStateSchemaV1
>;

export const AdminPricingRevisionAssistantApprovalSchemaV1 = z.object({
  approvalId: z.string().uuid(),
  runId: z.string().uuid(),
  decision: AdminPricingRevisionAssistantApprovalDecisionSchemaV1,
  approvedBy: z.string().uuid(),
  approvedByEmail: z.string().email().optional(),
  approvedRole: z.string().optional(),
  notes: z.string().max(2000).optional(),
  createdAt: z.string(),
});

export type AdminPricingRevisionAssistantApprovalV1 = z.infer<
  typeof AdminPricingRevisionAssistantApprovalSchemaV1
>;

export const AdminPricingRevisionAssistantApprovalRequestSchemaV1 = z.object({
  version: z.literal(1),
  decision: AdminPricingRevisionAssistantApprovalDecisionSchemaV1,
  notes: z.string().max(2000).optional(),
});

export type AdminPricingRevisionAssistantApprovalRequestV1 = z.infer<
  typeof AdminPricingRevisionAssistantApprovalRequestSchemaV1
>;

export const AdminPricingRevisionAssistantRunSchemaV1 = z.object({
  runId: z.string().uuid(),
  status: AdminPricingRevisionAssistantStatusSchemaV1,
  instructions: z.string(),
  focusAreas: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  baseVersion: z.string(),
  proposalConfig: AdminPricingConfigSchema.optional(),
  adjustments: z.array(AdminPricingRevisionAssistantAdjustmentSchemaV1).optional(),
  diffSummary: z.array(z.string()).optional(),
  notes: z.string().optional(),
  error: z.string().optional(),
  approvalState: AdminPricingRevisionDualControlStateSchemaV1.optional(),
  approvalRequired: z.boolean().optional(),
  approvals: z.array(AdminPricingRevisionAssistantApprovalSchemaV1).optional(),
  proposalDigest: z.string().optional(),
});

export type AdminPricingRevisionAssistantRunV1 = z.infer<typeof AdminPricingRevisionAssistantRunSchemaV1>;
