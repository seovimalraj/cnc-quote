import { z } from "zod";

export const laneSchema = z.enum(["NEW", "IN_REVIEW", "APPROVED", "REJECTED"]);
export type Lane = z.infer<typeof laneSchema>;

export const prioritySchema = z.enum(["LOW", "MED", "HIGH", "EXPEDITE"]);
export type Priority = z.infer<typeof prioritySchema>;

export const currencySchema = z.enum(["USD", "EUR", "GBP", "NOK", "INR"]);
export type CurrencyCode = z.infer<typeof currencySchema>;

export const sortFieldSchema = z.enum([
  "createdAt",
  "totalValue",
  "dfmFindingCount",
  "priority",
  "lastActionAt",
]);
export type SortField = z.infer<typeof sortFieldSchema>;

export const orderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof orderSchema>;

export const listQuerySchema = z
  .object({
    lane: z.union([laneSchema, z.array(laneSchema)]).optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    assignee: z.union([z.string(), z.array(z.string())]).optional(),
    priority: z.union([prioritySchema, z.array(prioritySchema)]).optional(),
    hasDFM: z.coerce.boolean().optional(),
    search: z.string().max(128).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    minValue: z.coerce.number().min(0).optional(),
    maxValue: z.coerce.number().min(0).optional(),
    sort: sortFieldSchema.default("createdAt"),
    order: orderSchema.default("desc"),
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
      message: "minValue must be <= maxValue",
      path: ["minValue"],
    },
  );

export type ReviewListFilters = z.infer<typeof listQuerySchema>;

export type AdminReviewItem = {
  id: string;
  quoteNo: string;
  customerName: string;
  company: string;
  createdAt: string;
  submittedBy: string;
  lane: Lane;
  statusReason?: string | null;
  totalItems: number;
  totalValue: number;
  currency: CurrencyCode;
  dfmFindingCount: number;
  priority: Priority;
  assignee?: string | null;
  lastActionAt?: string | null;
};

export type PageMeta = {
  nextCursor?: string | null;
  limit: number;
  totalApprox?: number | null;
};

export type ReviewStats = {
  totalRows: number;
  totalValue: number;
  conversionRate: number;
};

export type ReviewListResponse = {
  data: AdminReviewItem[];
  meta: PageMeta;
  stats: ReviewStats;
};

export type ReviewDetailResponse = {
  item: AdminReviewItem;
  workspace: {
    dfm: Array<{
      id: string;
      severity: "LOW" | "MED" | "HIGH";
      rule: string;
      partId?: string | null;
      message: string;
      createdAt: string;
    }>;
    pricingSummary: {
      materialCost: number;
      machiningCost: number;
      finishingCost: number;
      total: number;
      currency: CurrencyCode;
    };
    activity: Array<{
      id: string;
      actor: string;
      action: string;
      at: string;
      meta?: Record<string, unknown>;
    }>;
    notes: Array<{
      id: string;
      author: string;
      text: string;
      at: string;
    }>;
  };
};
