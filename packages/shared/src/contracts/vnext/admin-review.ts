import { z } from 'zod';

export const AdminReviewLaneVNextSchema = z.enum(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED']);
export const AdminReviewPriorityVNextSchema = z.enum(['LOW', 'MED', 'HIGH', 'EXPEDITE']);

export const AdminReviewItemVNextSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  quoteNumber: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  lane: AdminReviewLaneVNextSchema,
  statusReason: z.string().nullable().optional(),
  totalItems: z.number(),
  totalValue: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  dfmFindingCount: z.number().nullable().optional(),
  priority: AdminReviewPriorityVNextSchema,
  assignee: z.string().nullable().optional(),
  submittedBy: z.string().nullable().optional(),
  createdAt: z.string(),
  lastActionAt: z.string().nullable().optional(),
});

export const AdminReviewWorkspaceEventVNextSchema = z.object({
  id: z.string(),
  actor: z.string().nullable().optional(),
  action: z.string(),
  at: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const AdminReviewWorkspaceNoteVNextSchema = z.object({
  id: z.string(),
  author: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  at: z.string(),
});

export const AdminReviewWorkspacePricingSummaryVNextSchema = z.object({
  materialCost: z.number().nullable().optional(),
  machiningCost: z.number().nullable().optional(),
  finishingCost: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
});

export const AdminReviewWorkspaceDfmIssueVNextSchema = z.object({
  id: z.string(),
  severity: z.enum(['LOW', 'MED', 'HIGH']).optional(),
  rule: z.string().nullable().optional(),
  partId: z.string().nullable().optional(),
  message: z.string(),
  createdAt: z.string(),
});

export const AdminReviewWorkspaceVNextSchema = z.object({
  dfm: z.array(AdminReviewWorkspaceDfmIssueVNextSchema),
  pricingSummary: AdminReviewWorkspacePricingSummaryVNextSchema,
  activity: z.array(AdminReviewWorkspaceEventVNextSchema),
  notes: z.array(AdminReviewWorkspaceNoteVNextSchema),
});

export const AdminReviewListMetaVNextSchema = z.object({
  limit: z.number(),
  totalApprox: z.number().nullable().optional(),
  nextCursor: z.string().nullable().optional(),
});

export const AdminReviewStatsVNextSchema = z.object({
  totalRows: z.number(),
  totalValue: z.number().nullable().optional(),
  conversionRate: z.number().nullable().optional(),
});

export const AdminReviewListResponseVNextSchema = z.object({
  data: z.array(AdminReviewItemVNextSchema),
  meta: AdminReviewListMetaVNextSchema,
  stats: AdminReviewStatsVNextSchema,
});

export const AdminReviewDetailResponseVNextSchema = z.object({
  item: AdminReviewItemVNextSchema,
  workspace: AdminReviewWorkspaceVNextSchema,
});

export type AdminReviewItemVNext = z.infer<typeof AdminReviewItemVNextSchema>;
export type AdminReviewWorkspaceVNext = z.infer<typeof AdminReviewWorkspaceVNextSchema>;
export type AdminReviewListResponseVNext = z.infer<typeof AdminReviewListResponseVNextSchema>;
export type AdminReviewDetailResponseVNext = z.infer<typeof AdminReviewDetailResponseVNextSchema>;
