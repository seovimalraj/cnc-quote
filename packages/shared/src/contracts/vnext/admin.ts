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

export const AdminReviewSummaryItemVNextSchema = z.object({
  task_id: z.string(),
  quote_id: z.string(),
  quote_number: z.string().nullable().optional(),
  org: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  value: z.number().nullable().optional(),
  dfm_blockers: z.number().nullable().optional(),
  age_min: z.number().int().nonnegative(),
  sla_minutes: z.number().int().nullable().optional(),
  breached: z.boolean(),
  assignee: z.string().nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
});

export const AdminReviewSummarySnapshotVNextSchema = z.object({
  window: z.string().min(1),
  count: z.number().int().nonnegative(),
  new_count: z.number().int().nonnegative(),
  aging_count: z.number().int().nonnegative(),
  breached_count: z.number().int().nonnegative(),
  items: z.array(AdminReviewSummaryItemVNextSchema),
  evaluated_at: z.string().datetime(),
});

export const AdminQueueSnapshotItemVNextSchema = z.object({
  name: z.string(),
  waiting: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  delayed: z.number().int().nonnegative(),
  failed_24h: z.number().int().nonnegative(),
  oldest_job_age_sec: z.number().int().nonnegative(),
});

export const AdminQueueSnapshotVNextSchema = z.object({
  window: z.string().min(1),
  evaluated_at: z.string().datetime(),
  queues: z.array(AdminQueueSnapshotItemVNextSchema),
});

export const AdminWebhookStatusItemVNextSchema = z.object({
  provider: z.string(),
  status: z.string(),
  failed_24h: z.number().int().nonnegative(),
  last_event_type: z.string().nullable().optional(),
  last_delivery_age: z.number().int().nullable().optional(),
});

export const AdminWebhookStatusSnapshotVNextSchema = z.object({
  window: z.string().min(1),
  evaluated_at: z.string().datetime(),
  items: z.array(AdminWebhookStatusItemVNextSchema),
});

export const AdminErrorEventVNextSchema = z.object({
  id: z.string(),
  service: z.string(),
  title: z.string(),
  count_1h: z.number().int().nonnegative(),
  first_seen: z.string().datetime(),
  last_seen: z.string().datetime(),
  users_affected: z.number().int().nullable().optional(),
  permalink: z.string().nullable().optional(),
});

export const AdminFailedJobEventVNextSchema = z.object({
  when: z.string().datetime(),
  queue: z.string(),
  job_id: z.string(),
  attempts: z.number().int().nonnegative(),
  reason: z.string().nullable().optional(),
});

export const AdminErrorSnapshotVNextSchema = z.object({
  window: z.string().min(1),
  evaluated_at: z.string().datetime(),
  sentry: z.array(AdminErrorEventVNextSchema),
  failed_jobs: z.array(AdminFailedJobEventVNextSchema),
});

export const AdminSloSampleVNextSchema = z.object({
  ts: z.string().datetime(),
  first_price_ms: z.number().nullable().optional(),
  cad_ms: z.number().nullable().optional(),
  payment_to_order_ms: z.number().nullable().optional(),
});

export const AdminSloSnapshotVNextSchema = z.object({
  window: z.string().min(1),
  observed_at: z.string().datetime().nullable().optional(),
  first_price_p95_ms: z.number().nullable(),
  cad_p95_ms: z.number().nullable(),
  payment_to_order_p95_ms: z.number().nullable(),
  oldest_job_age_sec: z.number().nullable(),
  samples: z.array(AdminSloSampleVNextSchema).optional(),
  missing_metrics: z.array(z.string()).optional(),
});

export const AdminDbLatencySampleVNextSchema = z.object({
  ts: z.string().datetime(),
  read_ms: z.number().nullable().optional(),
  write_ms: z.number().nullable().optional(),
});

export const AdminDbLatencySnapshotVNextSchema = z.object({
  window: z.string().min(1),
  observed_at: z.string().datetime().nullable().optional(),
  read_p95_ms: z.number().nullable(),
  write_p95_ms: z.number().nullable(),
  error_rate_pct: z.number().nullable(),
  samples: z.array(AdminDbLatencySampleVNextSchema).optional(),
  missing_metrics: z.array(z.string()).optional(),
});

export type AbandonedQuoteVNext = z.infer<typeof AbandonedQuoteVNextSchema>;
export type AbandonedQuotesListVNext = z.infer<typeof AbandonedQuotesListVNextSchema>;
export type QuoteTimelineEventVNext = z.infer<typeof QuoteTimelineEventVNextSchema>;
export type QuoteTimelineVNext = z.infer<typeof QuoteTimelineVNextSchema>;
export type KanbanOrderVNext = z.infer<typeof KanbanOrderVNextSchema>;
export type KanbanBoardVNext = z.infer<typeof KanbanBoardVNextSchema>;
export type AdminReviewSummaryItemVNext = z.infer<typeof AdminReviewSummaryItemVNextSchema>;
export type AdminReviewSummarySnapshotVNext = z.infer<typeof AdminReviewSummarySnapshotVNextSchema>;
export type AdminQueueSnapshotItemVNext = z.infer<typeof AdminQueueSnapshotItemVNextSchema>;
export type AdminQueueSnapshotVNext = z.infer<typeof AdminQueueSnapshotVNextSchema>;
export type AdminWebhookStatusItemVNext = z.infer<typeof AdminWebhookStatusItemVNextSchema>;
export type AdminWebhookStatusSnapshotVNext = z.infer<typeof AdminWebhookStatusSnapshotVNextSchema>;
export type AdminErrorEventVNext = z.infer<typeof AdminErrorEventVNextSchema>;
export type AdminFailedJobEventVNext = z.infer<typeof AdminFailedJobEventVNextSchema>;
export type AdminErrorSnapshotVNext = z.infer<typeof AdminErrorSnapshotVNextSchema>;
export type AdminSloSampleVNext = z.infer<typeof AdminSloSampleVNextSchema>;
export type AdminSloSnapshotVNext = z.infer<typeof AdminSloSnapshotVNextSchema>;
export type AdminDbLatencySampleVNext = z.infer<typeof AdminDbLatencySampleVNextSchema>;
export type AdminDbLatencySnapshotVNext = z.infer<typeof AdminDbLatencySnapshotVNextSchema>;