import { z } from 'zod';

export const AbandonedQuoteVNextSchema = z
  .object({
    id: z.string(),
    organization_id: z.string(),
    buyer_name: z.string().optional(),
    buyer_email: z.string().optional(),
    last_activity: z.string(),
    stage: z.string(),
    subtotal: z.number(),
    currency: z.string().optional(),
    files_count: z.number().int().nonnegative().optional(),
    dfm_blockers_count: z.number().int().nonnegative().optional(),
    promo_tried: z.boolean().optional(),
    assignee_id: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const AbandonedQuotesListVNextSchema = z
  .object({
    quotes: z.array(AbandonedQuoteVNextSchema),
    total: z.number().int().nonnegative(),
    summary: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const QuoteTimelineEventVNextSchema = z
  .object({
    id: z.string(),
    quote_id: z.string(),
    user_id: z.string().nullable().optional(),
    actor_role: z.string().optional(),
    name: z.string(),
    ts: z.string(),
    props: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .passthrough();

export const QuoteTimelineVNextSchema = z
  .object({
    events: z.array(QuoteTimelineEventVNextSchema),
    total: z.number().int().nonnegative(),
  })
  .passthrough();

const KanbanTimelineEntryVNextSchema = z
  .object({
    status: z.string(),
    timestamp: z.string(),
    notes: z.string().optional(),
    userId: z.string().optional(),
  })
  .passthrough();

const KanbanLineItemVNextSchema = z
  .object({
    id: z.string(),
    partName: z.string().optional(),
    fileName: z.string().optional(),
    quantity: z.number().int().nonnegative().optional(),
    material: z.string().optional(),
    process: z.string().optional(),
    unitPrice: z.number().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const KanbanOrderVNextSchema = z
  .object({
    id: z.string(),
    quoteId: z.string().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    status: z.string(),
    priority: z.string().optional(),
    totalValue: z.number().optional(),
    currency: z.string().optional(),
    orderDate: z.string().optional(),
    estimatedDelivery: z.string().nullable().optional(),
    actualDelivery: z.string().nullable().optional(),
    items: z.array(KanbanLineItemVNextSchema).optional(),
    timeline: z.array(KanbanTimelineEntryVNextSchema).optional(),
    assignedTo: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    lastUpdated: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const KanbanColumnsVNextSchema = z.object({
  quote: z.array(KanbanOrderVNextSchema),
  ordered: z.array(KanbanOrderVNextSchema),
  production: z.array(KanbanOrderVNextSchema),
  shipping: z.array(KanbanOrderVNextSchema),
  delivered: z.array(KanbanOrderVNextSchema),
});

export const KanbanBoardStatsVNextSchema = z
  .object({
    totalOrders: z.number().int().nonnegative(),
    totalValue: z.number().optional(),
    byStatus: z.record(z.number()).optional(),
    byPriority: z.record(z.number()).optional(),
  })
  .passthrough();

export const KanbanBoardVNextSchema = z
  .object({
    success: z.boolean().optional(),
    data: KanbanColumnsVNextSchema,
    stats: KanbanBoardStatsVNextSchema,
    lastUpdated: z.string().optional(),
  })
  .passthrough();

export type AbandonedQuoteVNext = z.infer<typeof AbandonedQuoteVNextSchema>;
export type AbandonedQuotesListVNext = z.infer<typeof AbandonedQuotesListVNextSchema>;
export type QuoteTimelineEventVNext = z.infer<typeof QuoteTimelineEventVNextSchema>;
export type QuoteTimelineVNext = z.infer<typeof QuoteTimelineVNextSchema>;
export type KanbanOrderVNext = z.infer<typeof KanbanOrderVNextSchema>;
export type KanbanBoardVNext = z.infer<typeof KanbanBoardVNextSchema>;