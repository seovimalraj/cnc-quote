import { z } from 'zod';

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  role: z.enum(['admin', 'user', 'viewer']),
  organization_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_login_at: z.string().datetime().optional(),
});

// Organization Schema
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.string().optional(),
  logo_url: z.string().url().optional(),
  billing_email: z.string().email(),
  subscription_status: z.enum(['trial', 'active', 'past_due', 'cancelled']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// File Schema
export const FileSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  bucket_id: z.string(),
  storage_path: z.string(),
  original_name: z.string(),
  size_bytes: z.number().positive(),
  mime_type: z.string(),
  sha256_hash: z.string(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['pending', 'scanning', 'clean', 'infected', 'error']),
  error_message: z.string().optional(),
  uploaded_by: z.string().uuid(),
  uploaded_at: z.string().datetime(),
  scanned_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// CAD Task Schema
export const CadTaskSchema = z.object({
  id: z.string().uuid(),
  file_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  status: z.enum(['Queued', 'Processing', 'Succeeded', 'Failed']),
  features: z.record(z.unknown()).optional(),
  error_code: z.string().optional(),
  processing_started_at: z.string().datetime().optional(),
  processing_completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Quote Item Schema
export const QuoteItemSchema = z.object({
  id: z.string().uuid(),
  file_id: z.string().uuid(),
  process: z.string(),
  material: z.string(),
  finish: z.string().optional(),
  qty: z.number().positive(),
  unit_price: z.number().positive().optional(),
  total_price: z.number().positive().optional(),
  lead_time_days: z.number().positive().optional(),
});

// Quote Schema
export const QuoteSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  status: z.enum([
    'Draft',
    'Configured',
    'Analyzing',
    'Priced',
    'Needs_Review',
    'Reviewed',
    'Sent',
    'Accepted',
    'Rejected',
    'Expired'
  ]),
  items: z.array(QuoteItemSchema),
  pricing: z.record(z.unknown()).optional(),
  dfm_flags: z.array(z.string()).optional(),
  currency: z.string().default('USD'),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Order Totals Schema
export const OrderTotalsSchema = z.object({
  subtotal: z.number().positive(),
  tax: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  grand_total: z.number().positive(),
});

// Order Schema
export const OrderSchema = z.object({
  id: z.string().uuid(),
  quote_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  status: z.enum([
    'Pending',
    'In_Production',
    'QA_Incoming',
    'QA_Final',
    'Ready_To_Ship',
    'Shipped',
    'Completed',
    'On_Hold',
    'Cancelled',
    'Refunded'
  ]),
  totals: OrderTotalsSchema,
  shipping_address: z.record(z.unknown()).optional(),
  billing_address: z.record(z.unknown()).optional(),
  tracking_number: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Payment Schema
export const PaymentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  provider: z.enum(['stripe', 'paypal']),
  provider_payment_id: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// QAP Document Schema
export const QapDocumentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  template_id: z.string().uuid(),
  document_data: z.record(z.unknown()),
  status: z.enum(['draft', 'generated', 'approved', 'rejected']),
  generated_url: z.string().url().optional(),
  approved_at: z.string().datetime().optional(),
  approved_by: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type File = z.infer<typeof FileSchema>;
export type CadTask = z.infer<typeof CadTaskSchema>;
export type QuoteItem = z.infer<typeof QuoteItemSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type OrderTotals = z.infer<typeof OrderTotalsSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type QapDocument = z.infer<typeof QapDocumentSchema>;

// State machine enums
export const QuoteStatus = {
  DRAFT: 'Draft',
  CONFIGURED: 'Configured',
  ANALYZING: 'Analyzing',
  PRICED: 'Priced',
  NEEDS_REVIEW: 'Needs_Review',
  REVIEWED: 'Reviewed',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
} as const;

export const OrderStatus = {
  PENDING: 'Pending',
  IN_PRODUCTION: 'In_Production',
  QA_INCOMING: 'QA_Incoming',
  QA_FINAL: 'QA_Final',
  READY_TO_SHIP: 'Ready_To_Ship',
  SHIPPED: 'Shipped',
  COMPLETED: 'Completed',
  ON_HOLD: 'On_Hold',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
} as const;

export const CadTaskStatus = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
} as const;

export type QuoteStatusType = typeof QuoteStatus[keyof typeof QuoteStatus];
export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];
export type CadTaskStatusType = typeof CadTaskStatus[keyof typeof CadTaskStatus];
