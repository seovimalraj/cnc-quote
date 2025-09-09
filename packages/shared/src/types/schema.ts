import { z } from 'zod';

// User Schema (enhanced for admin workcenter)
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  status: z.enum(['active', 'disabled', 'invited', 'pending_migration']),
  last_active_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  mfa_enabled: z.boolean().default(false),
  sso_provider: z.enum(['none', 'google', 'azure', 'okta']).default('none'),
  avatar_url: z.string().url().nullable(),
  updated_at: z.string().datetime(),
});

// Organization Schema (enhanced for admin workcenter)
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  billing_status: z.enum(['trial', 'active', 'past_due', 'canceled']).default('trial'),
  country: z.string(),
  itar_mode: z.boolean().default(false),
  dfars_only: z.boolean().default(false),
  widget_origins: z.array(z.string().url()),
  default_currency: z.string().default('USD'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Membership Schema
export const MembershipSchema = z.object({
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  role: z.enum(['buyer', 'org_admin', 'reviewer', 'operator', 'finance', 'admin']),
  created_at: z.string().datetime(),
  last_role_change_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Invite Schema
export const InviteSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  organization_id: z.string().uuid(),
  role: z.enum(['buyer', 'org_admin', 'reviewer', 'operator', 'finance']),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']),
  sent_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Quota Schema
export const QuotaSchema = z.object({
  organization_id: z.string().uuid(),
  limit: z.object({
    storage_gb: z.number().positive(),
    cad_jobs_month: z.number().positive(),
    quotes_month: z.number().positive(),
    orders_month: z.number().positive(),
    api_calls_hour: z.number().positive(),
    widget_origins_max: z.number().positive(),
    users_max: z.number().positive(),
  }),
  usage: z.object({
    storage_gb: z.number().default(0),
    cad_jobs_month: z.number().default(0),
    quotes_month: z.number().default(0),
    orders_month: z.number().default(0),
    api_calls_hour: z.number().default(0),
    users_current: z.number().default(0),
  }),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// AuditEvent Schema
export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  actor_user_id: z.string().uuid(),
  actor_ip: z.string(),
  org_id: z.string().uuid().nullable(),
  target_type: z.enum(['user', 'organization', 'membership', 'invite']),
  target_id: z.string().uuid(),
  action: z.enum(['create', 'update', 'delete', 'role_change', 'disable', 'enable', 'invite_send', 'invite_resend', 'invite_revoke', 'impersonate_start', 'impersonate_end', 'quota_edit']),
  before: z.record(z.unknown()).nullable(),
  after: z.record(z.unknown()).nullable(),
  ts: z.string().datetime(),
  created_at: z.string().datetime(),
});

// File Schema (updated for admin workcenter)
export const FileSchema = z.object({
  id: z.string().uuid(),
  bucket: z.string(),
  path: z.string(),
  org_id: z.string().uuid(),
  linked_type: z.enum(['org', 'quote', 'order', 'qap', 'invoice', 'other']),
  linked_id: z.string().uuid().nullable(),
  name: z.string(),
  mime: z.string(),
  size_bytes: z.number().positive(),
  checksum_sha256: z.string(),
  uploaded_by: z.string().uuid(),
  uploaded_at: z.string().datetime(),
  signed_url: z.string().url().nullable(),
  signed_url_expires_at: z.string().datetime().nullable(),
  sensitivity: z.enum(['standard', 'itar', 'cui']),
  virus_scan: z.enum(['pending', 'clean', 'infected']),
  download_count: z.number().default(0),
  last_access_at: z.string().datetime().nullable(),
  deleted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// WebhookEvent Schema
export const WebhookEventSchema = z.object({
  id: z.string().uuid(),
  provider: z.enum(['stripe', 'paypal']),
  event_type: z.string(),
  received_at: z.string().datetime(),
  signature_ok: z.boolean(),
  processed: z.boolean(),
  processed_at: z.string().datetime().nullable(),
  http_status: z.number().nullable(),
  error: z.string().nullable(),
  idempotency_key: z.string().nullable(),
  order_id: z.string().uuid().nullable(),
  quote_id: z.string().uuid().nullable(),
  payload_summary: z.record(z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Refund Schema
export const RefundSchema = z.object({
  id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  order_id: z.string().uuid(),
  provider: z.enum(['stripe', 'paypal']),
  amount: z.number().positive(),
  reason: z.enum(['customer_request', 'quality_issue', 'duplicate', 'other']),
  status: z.enum(['pending', 'succeeded', 'failed']),
  created_at: z.string().datetime(),
  provider_ref_id: z.string().nullable(),
  updated_at: z.string().datetime(),
});

// FinanceSettings Schema
export const FinanceSettingsSchema = z.object({
  tax_mode: z.enum(['none', 'fixed', 'provider']),
  default_tax_rate: z.number().min(0).max(1),
  regions: z.array(z.object({
    country: z.string(),
    state: z.string().optional(),
    rate: z.number().min(0).max(1),
    nexus: z.boolean(),
    exempt_org_ids: z.array(z.string().uuid())
  })),
  incoterms_enabled: z.array(z.enum(['EXW', 'FOB', 'DDP', 'DAP'])),
  default_incoterm: z.enum(['EXW', 'FOB', 'DDP', 'DAP']),
  shipping_estimators: z.array(z.enum(['table_rate', 'carrier_api'])),
  currency: z.string().default('USD'),
  test_mode: z.boolean(),
  updated_at: z.string().datetime(),
  updated_by: z.string().uuid(),
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

// Address Schema
export const AddressSchema = z.object({
  name: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postal: z.string(),
  country: z.string(),
  phone: z.string().optional(),
});

// Work Order Schema
export const WorkOrderSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  part_ref: z.string(),
  operation: z.enum(['Setup', 'CNC', 'Turning', 'Deburr', 'Finish', 'Inspection', 'Packaging', 'Other']),
  workcenter_id: z.string().uuid(),
  assignee_id: z.string().uuid().optional(),
  planned_start: z.string().datetime().optional(),
  planned_end: z.string().datetime().optional(),
  actual_start: z.string().datetime().optional(),
  actual_end: z.string().datetime().optional(),
  status: z.enum(['NotStarted', 'Running', 'Blocked', 'Done']),
  est_minutes: z.number().positive(),
  notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Package Schema
export const PackageSchema = z.object({
  id: z.string().uuid(),
  length_mm: z.number().positive(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  weight_kg: z.number().positive(),
  contents: z.array(z.object({
    part: z.string(),
    qty: z.number().positive(),
  })),
  label_url: z.string().url().optional(),
});

// Shipment Schema
export const ShipmentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  carrier: z.enum(['UPS', 'FedEx', 'DHL', 'USPS', 'Freight', 'Manual']),
  service: z.string(),
  incoterms: z.enum(['EXW', 'FOB', 'DDP', 'DAP', 'CPT', 'CIF', 'Other']),
  packages: z.array(PackageSchema),
  tracking_numbers: z.array(z.string()),
  ship_date: z.string().date(),
  status: z.enum(['Draft', 'Label_Created', 'In_Transit', 'Delivered', 'Exception', 'Cancelled']),
  docs: z.array(z.string().uuid()), // DocRef IDs
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Document Reference Schema
export const DocRefSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['CoC', 'FAIR', 'Measurement', 'MaterialCert', 'Invoice', 'QAP', 'Other']),
  name: z.string(),
  url: z.string().url(),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected']),
  uploaded_by: z.string().uuid(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Order Schema (expanded)
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
  priority: z.enum(['Low', 'Normal', 'High', 'Critical']),
  due_date: z.string().date(),
  customer_po: z.string().optional(),
  totals: OrderTotalsSchema,
  addresses: z.object({
    ship_to: AddressSchema,
    bill_to: AddressSchema,
  }),
  routing: z.array(WorkOrderSchema),
  shipments: z.array(ShipmentSchema),
  documents: z.array(DocRefSchema),
  qap_doc_id: z.string().uuid().optional(),
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

// FileMeta Schema (for Documents and Files workcenter)
export const FileMetaSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  bucket: z.string(),
  path: z.string(),
  name: z.string(),
  size_bytes: z.number().positive(),
  mime: z.string(),
  hash_sha256: z.string(),
  kind: z.enum(['cad', 'drawing', 'qap', 'certificate', 'fair', 'measurement', 'invoice', 'receipt', 'other']),
  linked_to: z.array(z.object({
    type: z.enum(['quote', 'order', 'order_line', 'qap', 'certificate']),
    id: z.string().uuid(),
  })),
  tags: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
  itar_cui: z.boolean(),
  virus_scanned: z.boolean(),
  preview_ready: z.boolean(),
});

// QAPDocument Schema (for Documents workcenter)
export const QAPDocumentSchemaV2 = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  order_id: z.string().uuid(),
  order_line_ids: z.array(z.string().uuid()),
  template_id: z.string().uuid(),
  status: z.enum(['Draft', 'Generated', 'Error']),
  file_id: z.string().uuid(),
  generated_at: z.string().datetime(),
});

// Certificate Schema (for Documents workcenter)
export const CertificateSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
  order_line_id: z.string().uuid().optional(),
  type: z.enum(['CoC', 'MaterialCert', 'HeatLot', 'RoHS', 'REACH', 'Custom']),
  file_id: z.string().uuid(),
  verified: z.boolean(),
  verified_by: z.string().uuid().optional(),
  verified_at: z.string().datetime().optional(),
});

// FAIRReport Schema (for Documents workcenter)
export const FAIRReportSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  order_id: z.string().uuid(),
  file_id: z.string().uuid(),
  standard: z.enum(['AS9102', 'Custom']),
  status: z.enum(['Uploaded', 'Generated', 'Reviewed']),
  review_notes: z.string().optional(),
});

// Invoice Schema (updated for finance workcenter)
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  quote_id: z.string().uuid(),
  provider: z.enum(['stripe', 'paypal', 'manual']),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  status: z.enum(['draft', 'sent', 'paid', 'void', 'refunded', 'partial_refund']),
  issued_at: z.string().datetime(),
  receipt_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// RateCardMachine Schema (for Pricing Operations)
export const RateCardMachineSchema = z.object({
  id: z.string().uuid(),
  machine_id: z.string().uuid(),
  region: z.enum(['USA', 'International', 'Custom']),
  currency: z.string(),
  effective_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  hourly_rate: z.number().positive(),
  min_setup_minutes: z.number().nonnegative(),
  min_order_fee: z.number().nonnegative(),
  overhead_pct: z.number().min(0).max(100),
  margin_pct: z.number().min(0).max(100),
  notes: z.string().optional(),
  version: z.number().int().positive(),
  status: z.enum(['Draft', 'Published', 'Archived']),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid(),
});

// RateCardMaterial Schema (for Pricing Operations)
export const RateCardMaterialSchema = z.object({
  id: z.string().uuid(),
  material_grade: z.string(),
  region: z.enum(['USA', 'International', 'Custom']),
  unit: z.enum(['kg', 'lb']),
  buy_price_per_unit: z.number().positive(),
  waste_factor_pct: z.number().min(0).max(100),
  scrap_recovery_pct: z.number().min(0).max(100),
  leadtime_days_add: z.number().nonnegative(),
  source: z.enum(['Distributor', 'Manual', 'API']),
  version: z.number().int().positive(),
  status: z.enum(['Draft', 'Published', 'Archived']),
});

// RateCardFinish Schema (for Pricing Operations)
export const RateCardFinishSchema = z.object({
  id: z.string().uuid(),
  finish_code: z.string(),
  pricing_mode: z.enum(['per_part', 'per_area', 'per_batch']),
  price: z.number().positive(),
  leadtime_days_add: z.number().nonnegative(),
  capacity_max_dim_mm: z.tuple([z.number(), z.number(), z.number()]),
  notes: z.string().optional(),
  version: z.number().int().positive(),
  status: z.enum(['Draft', 'Published', 'Archived']),
});

// FeatureMultiplier Schema (for Pricing Operations)
export const FeatureMultiplierSchema = z.object({
  id: z.string().uuid(),
  feature_code: z.string(),
  metric: z.string(),
  curve: z.enum(['piecewise', 'linear', 'logistic']),
  breakpoints: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })),
  cap_min: z.number().optional(),
  cap_max: z.number().optional(),
  notes: z.string().optional(),
  version: z.number().int().positive(),
  status: z.enum(['Draft', 'Published', 'Archived']),
});

// RiskRule Schema (for Pricing Operations)
export const RiskRuleSchema = z.object({
  id: z.string().uuid(),
  signal: z.string(),
  threshold: z.number(),
  severity: z.enum(['low', 'med', 'high', 'critical']),
  adder_type: z.enum(['percent', 'absolute']),
  adder_value: z.number().positive(),
  route_to_review_over: z.number().optional(),
  notes: z.string().optional(),
  version: z.number().int().positive(),
  status: z.enum(['Draft', 'Published', 'Archived']),
});

// TimeStudy Schema (for Pricing Operations)
export const TimeStudySchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  line_id: z.string().uuid(),
  machine_id: z.string().uuid(),
  estimated_cycle_min: z.number().positive(),
  actual_cycle_min: z.number().positive(),
  estimated_setup_min: z.number().positive(),
  actual_setup_min: z.number().positive(),
  op_breakdown: z.array(z.object({
    op: z.string(),
    est: z.number(),
    actual: z.number(),
  })),
  delta_pct: z.number(),
  notes: z.string().optional(),
  approved: z.boolean(),
  approved_by: z.string().uuid().optional(),
  created_at: z.string().datetime(),
});

// MLSuggestion Schema (for Pricing Operations)
export const MLSuggestionSchema = z.object({
  id: z.string().uuid(),
  scope: z.enum(['machine_rate', 'material_price', 'feature_multiplier', 'risk_rule']),
  target_id: z.string().uuid(),
  suggested_change: z.object({
    path: z.string(),
    from: z.number(),
    to: z.number(),
  }),
  confidence: z.number().min(0).max(1),
  supporting_samples: z.number().int().positive(),
  impact_estimate: z.object({
    median_unit_price_delta_pct: z.number(),
  }),
  status: z.enum(['Pending', 'Accepted', 'Rejected', 'Applied']),
  created_at: z.string().datetime(),
});

// Metrics Timeseries Schema
export const MetricsTimeseriesSchema = z.object({
  id: z.string().uuid(),
  metric: z.string(),
  value: z.number(),
  percentile: z.string().optional(), // 'p50', 'p95', 'p99', 'raw'
  labels: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
});

// Metrics Gauges Schema
export const MetricsGaugesSchema = z.object({
  id: z.string().uuid(),
  metric: z.string(),
  value: z.number(),
  timestamp: z.string().datetime(),
});

// Metrics Histogram Schema
export const MetricsHistogramSchema = z.object({
  id: z.string().uuid(),
  metric: z.string(),
  bucket_range: z.string(), // e.g., "0-10ms", "10-50ms"
  count: z.number().int(),
  timestamp: z.string().datetime(),
});

// Error Events Schema
export const ErrorEventsSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  module: z.string(),
  status_code: z.number().int().nullable(),
  error_message: z.string(),
  stack_trace: z.string().optional(),
  user_id: z.string().uuid().optional(),
  request_id: z.string().optional(),
  url: z.string().optional(),
  user_agent: z.string().optional(),
});

// Alert Rules Schema
export const AlertRulesSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  condition: z.string(), // e.g., "p95(first_price) > 2000"
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  channels: z.array(z.string()),
  enabled: z.boolean().default(true),
  window: z.string(), // e.g., "5m", "1h"
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_triggered: z.string().datetime().optional(),
});

// Alert Incidents Schema
export const AlertIncidentsSchema = z.object({
  id: z.string().uuid(),
  rule_id: z.string().uuid(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['active', 'acknowledged', 'resolved']),
  started_at: z.string().datetime(),
  acknowledged_at: z.string().datetime().optional(),
  resolved_at: z.string().datetime().optional(),
  acknowledged_by: z.string().uuid().optional(),
  description: z.string(),
  value: z.number(),
  threshold: z.number(),
});

// Alert Channels Schema
export const AlertChannelsSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['email', 'slack', 'webhook', 'sms']),
  target: z.string(), // email address, slack webhook URL, etc.
  status: z.enum(['active', 'inactive']).default('active'),
  created_at: z.string().datetime(),
  last_used: z.string().datetime().optional(),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type File = z.infer<typeof FileSchema>;
export type CadTask = z.infer<typeof CadTaskSchema>;
export type QuoteItem = z.infer<typeof QuoteItemSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type OrderTotals = z.infer<typeof OrderTotalsSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type DocRef = z.infer<typeof DocRefSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type QapDocument = z.infer<typeof QapDocumentSchema>;

// New type exports for Documents/Files and Pricing Operations
export type FileMeta = z.infer<typeof FileMetaSchema>;
export type QAPDocument = z.infer<typeof QAPDocumentSchemaV2>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type FAIRReport = z.infer<typeof FAIRReportSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type RateCardMachine = z.infer<typeof RateCardMachineSchema>;
export type RateCardMaterial = z.infer<typeof RateCardMaterialSchema>;
export type RateCardFinish = z.infer<typeof RateCardFinishSchema>;
export type FeatureMultiplier = z.infer<typeof FeatureMultiplierSchema>;
export type RiskRule = z.infer<typeof RiskRuleSchema>;
export type TimeStudy = z.infer<typeof TimeStudySchema>;
export type MLSuggestion = z.infer<typeof MLSuggestionSchema>;

// Catalog Management Schemas
export const MachineSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC_Milling', 'CNC_Turning', '5-Axis', 'Waterjet', 'Laser', 'PressBrake']),
  axes: z.number().int().min(3).max(5),
  region: z.enum(['USA', 'International']),
  itar_approved: z.boolean(),
  envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  min_tool_diameter_mm: z.number().positive().optional(),
  max_spindle_rpm: z.number().positive().optional(),
  max_feed_mm_per_min: z.number().positive().optional(),
  fixture_types: z.array(z.string()),
  supported_ops: z.array(z.string()),
  hourly_rate_usd: z.number().min(10),
  setup_time_min: z.number().min(0),
  changeover_cost_usd: z.number().min(0).optional(),
  maintenance_overhead_pct: z.number().min(0).max(100).optional(),
  risk_multiplier: z.number().min(0.1).max(5).default(1.0),
  constraints: z.object({
    min_corner_radius_mm: z.number().positive().optional(),
    max_depth_to_toolD_ratio: z.number().positive().optional(),
    min_clamp_pad_mm: z.number().positive().optional(),
    material_blacklist: z.array(z.string()),
    finish_blacklist: z.array(z.string()),
  }),
  availability: z.object({
    status: z.enum(['Available', 'Maintenance', 'Decommissioned']),
    calendar_blackouts: z.array(z.string().datetime()),
    capacity_hours_per_week: z.number().positive(),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  grade: z.string(),
  family: z.enum(['Aluminum', 'Steel', 'Stainless', 'Titanium', 'Brass', 'Copper', 'Plastic']),
  spec: z.string().optional(),
  processes: z.array(z.enum(['CNC', 'SheetMetal', 'InjectionMolding'])),
  region: z.enum(['USA', 'International']),
  density_g_cc: z.number().positive().optional(),
  yield_strength_mpa: z.number().positive().optional(),
  hardness_hb: z.number().positive().optional(),
  ctexp_um_mC: z.number().optional(),
  machinability_1_5: z.number().int().min(1).max(5),
  stock_forms: z.array(z.enum(['Plate', 'Bar', 'Rod', 'Sheet', 'Block'])),
  thickness_range_mm: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  buy_price_usd_per_kg: z.number().positive(),
  waste_factor_pct: z.number().min(0).max(100).default(15),
  min_lot_charge_usd: z.number().min(0).optional(),
  min_wall_mm: z.number().positive().optional(),
  compatible_finishes: z.array(z.string().uuid()),
  finish_exclusions: z.array(z.string().uuid()),
  retired: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const FinishSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  process: z.enum(['Anodize', 'PowderCoat', 'BeadBlast', 'Passivation', 'Electropolish', 'BlackOxide', 'Painting']),
  class_spec: z.string().optional(),
  cosmetic_class: z.enum(['Industrial', 'Cosmetic A', 'Cosmetic AA']).optional(),
  color_system: z.enum(['RAL', 'Pantone', 'N/A']).optional(),
  color_codes: z.array(z.string()),
  thickness_um_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  surface_prep_required: z.boolean().default(false),
  masking_supported: z.boolean().default(false),
  thread_protection_rule: z.enum(['Mask Threads', 'Re-tap After', 'No Threads Allowed']),
  max_envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  material_whitelist: z.array(z.string()),
  material_blacklist: z.array(z.string()),
  cost_model: z.enum(['PerPart', 'PerArea', 'PerVolume', 'LotCharge+PerPart']),
  min_charge_usd: z.number().min(0),
  rate_per_part_usd: z.number().min(0).optional(),
  rate_per_area_usd_m2: z.number().min(0).optional(),
  rate_per_volume_usd_dm3: z.number().min(0).optional(),
  lead_time_days: z.number().min(0),
  expedite_supported: z.boolean().default(false),
  disabled: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const InspectionTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['Standard', 'Formal+DimReport', 'CMM', 'FAIR_AS9102', 'Source', 'Custom']),
  requires_drawing: z.boolean().default(false),
  max_dimensions: z.number().int().positive(),
  sampling_plan: z.enum(['100%', 'AQL 1.0', 'AQL 2.5', 'SPC (n per lot)']),
  deliverables: z.array(z.enum(['Dimensional Report', 'CMM Report', 'FAIR (AS9102)', 'Material Certs', 'CoC', 'Photos'])),
  base_cost_usd: z.number().min(0),
  cost_per_dim_usd: z.number().min(0),
  lead_time_days: z.number().min(0),
  rules: z.object({
    requires_drawing_if_over_dims: z.number().int().positive().optional(),
    requires_material_cert: z.boolean().default(false),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const QAPTemplateSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC', 'SheetMetal', 'InjectionMolding']),
  industry: z.enum(['General', 'Aerospace', 'Medical', 'Automotive']),
  rev: z.string(),
  owner_user_id: z.string().uuid(),
  variables: z.record(z.unknown()),
  steps: z.array(z.object({
    title: z.string(),
    description_md: z.string(),
    responsible_role: z.string(),
    gate: z.boolean(),
  })),
  checkpoints: z.array(z.object({
    name: z.string(),
    type: z.string(),
    frequency: z.string(),
    sampling: z.string(),
  })),
  required_docs: z.array(z.enum(['CoC', 'Material Cert', 'Dimensional Report', 'FAIR', 'CMM', 'Photos'])),
  packaging_instructions: z.string().optional(),
  labeling_rules: z.string().optional(),
  signoffs: z.array(z.object({
    role: z.string(),
    name: z.string().optional(),
    signature_required: z.boolean(),
  })),
  published: z.boolean().default(false),
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
export type Address = z.infer<typeof AddressSchema>;
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type DocRef = z.infer<typeof DocRefSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type QapDocument = z.infer<typeof QapDocumentSchema>;

// New type exports for Documents/Files and Pricing Operations
export type FileMeta = z.infer<typeof FileMetaSchema>;
export type QAPDocument = z.infer<typeof QAPDocumentSchemaV2>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type FAIRReport = z.infer<typeof FAIRReportSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type RateCardMachine = z.infer<typeof RateCardMachineSchema>;
export type RateCardMaterial = z.infer<typeof RateCardMaterialSchema>;
export type RateCardFinish = z.infer<typeof RateCardFinishSchema>;
export type FeatureMultiplier = z.infer<typeof FeatureMultiplierSchema>;
export type RiskRule = z.infer<typeof RiskRuleSchema>;
export type TimeStudy = z.infer<typeof TimeStudySchema>;
export type MLSuggestion = z.infer<typeof MLSuggestionSchema>;

// Catalog Management Schemas
export const MachineSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC_Milling', 'CNC_Turning', '5-Axis', 'Waterjet', 'Laser', 'PressBrake']),
  axes: z.number().int().min(3).max(5),
  region: z.enum(['USA', 'International']),
  itar_approved: z.boolean(),
  envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  min_tool_diameter_mm: z.number().positive().optional(),
  max_spindle_rpm: z.number().positive().optional(),
  max_feed_mm_per_min: z.number().positive().optional(),
  fixture_types: z.array(z.string()),
  supported_ops: z.array(z.string()),
  hourly_rate_usd: z.number().min(10),
  setup_time_min: z.number().min(0),
  changeover_cost_usd: z.number().min(0).optional(),
  maintenance_overhead_pct: z.number().min(0).max(100).optional(),
  risk_multiplier: z.number().min(0.1).max(5).default(1.0),
  constraints: z.object({
    min_corner_radius_mm: z.number().positive().optional(),
    max_depth_to_toolD_ratio: z.number().positive().optional(),
    min_clamp_pad_mm: z.number().positive().optional(),
    material_blacklist: z.array(z.string()),
    finish_blacklist: z.array(z.string()),
  }),
  availability: z.object({
    status: z.enum(['Available', 'Maintenance', 'Decommissioned']),
    calendar_blackouts: z.array(z.string().datetime()),
    capacity_hours_per_week: z.number().positive(),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  grade: z.string(),
  family: z.enum(['Aluminum', 'Steel', 'Stainless', 'Titanium', 'Brass', 'Copper', 'Plastic']),
  spec: z.string().optional(),
  processes: z.array(z.enum(['CNC', 'SheetMetal', 'InjectionMolding'])),
  region: z.enum(['USA', 'International']),
  density_g_cc: z.number().positive().optional(),
  yield_strength_mpa: z.number().positive().optional(),
  hardness_hb: z.number().positive().optional(),
  ctexp_um_mC: z.number().optional(),
  machinability_1_5: z.number().int().min(1).max(5),
  stock_forms: z.array(z.enum(['Plate', 'Bar', 'Rod', 'Sheet', 'Block'])),
  thickness_range_mm: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  buy_price_usd_per_kg: z.number().positive(),
  waste_factor_pct: z.number().min(0).max(100).default(15),
  min_lot_charge_usd: z.number().min(0).optional(),
  min_wall_mm: z.number().positive().optional(),
  compatible_finishes: z.array(z.string().uuid()),
  finish_exclusions: z.array(z.string().uuid()),
  retired: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const FinishSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  process: z.enum(['Anodize', 'PowderCoat', 'BeadBlast', 'Passivation', 'Electropolish', 'BlackOxide', 'Painting']),
  class_spec: z.string().optional(),
  cosmetic_class: z.enum(['Industrial', 'Cosmetic A', 'Cosmetic AA']).optional(),
  color_system: z.enum(['RAL', 'Pantone', 'N/A']).optional(),
  color_codes: z.array(z.string()),
  thickness_um_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  surface_prep_required: z.boolean().default(false),
  masking_supported: z.boolean().default(false),
  thread_protection_rule: z.enum(['Mask Threads', 'Re-tap After', 'No Threads Allowed']),
  max_envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  material_whitelist: z.array(z.string()),
  material_blacklist: z.array(z.string()),
  cost_model: z.enum(['PerPart', 'PerArea', 'PerVolume', 'LotCharge+PerPart']),
  min_charge_usd: z.number().min(0),
  rate_per_part_usd: z.number().min(0).optional(),
  rate_per_area_usd_m2: z.number().min(0).optional(),
  rate_per_volume_usd_dm3: z.number().min(0).optional(),
  lead_time_days: z.number().min(0),
  expedite_supported: z.boolean().default(false),
  disabled: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const InspectionTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['Standard', 'Formal+DimReport', 'CMM', 'FAIR_AS9102', 'Source', 'Custom']),
  requires_drawing: z.boolean().default(false),
  max_dimensions: z.number().int().positive(),
  sampling_plan: z.enum(['100%', 'AQL 1.0', 'AQL 2.5', 'SPC (n per lot)']),
  deliverables: z.array(z.enum(['Dimensional Report', 'CMM Report', 'FAIR (AS9102)', 'Material Certs', 'CoC', 'Photos'])),
  base_cost_usd: z.number().min(0),
  cost_per_dim_usd: z.number().min(0),
  lead_time_days: z.number().min(0),
  rules: z.object({
    requires_drawing_if_over_dims: z.number().int().positive().optional(),
    requires_material_cert: z.boolean().default(false),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const QAPTemplateSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC', 'SheetMetal', 'InjectionMolding']),
  industry: z.enum(['General', 'Aerospace', 'Medical', 'Automotive']),
  rev: z.string(),
  owner_user_id: z.string().uuid(),
  variables: z.record(z.unknown()),
  steps: z.array(z.object({
    title: z.string(),
    description_md: z.string(),
    responsible_role: z.string(),
    gate: z.boolean(),
  })),
  checkpoints: z.array(z.object({
    name: z.string(),
    type: z.string(),
    frequency: z.string(),
    sampling: z.string(),
  })),
  required_docs: z.array(z.enum(['CoC', 'Material Cert', 'Dimensional Report', 'FAIR', 'CMM', 'Photos'])),
  packaging_instructions: z.string().optional(),
  labeling_rules: z.string().optional(),
  signoffs: z.array(z.object({
    role: z.string(),
    name: z.string().optional(),
    signature_required: z.boolean(),
  })),
  published: z.boolean().default(false),
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
export type Address = z.infer<typeof AddressSchema>;
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type DocRef = z.infer<typeof DocRefSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type QapDocument = z.infer<typeof QapDocumentSchema>;

// New type exports for Documents/Files and Pricing Operations
export type FileMeta = z.infer<typeof FileMetaSchema>;
export type QAPDocument = z.infer<typeof QAPDocumentSchemaV2>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type FAIRReport = z.infer<typeof FAIRReportSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type RateCardMachine = z.infer<typeof RateCardMachineSchema>;
export type RateCardMaterial = z.infer<typeof RateCardMaterialSchema>;
export type RateCardFinish = z.infer<typeof RateCardFinishSchema>;
export type FeatureMultiplier = z.infer<typeof FeatureMultiplierSchema>;
export type RiskRule = z.infer<typeof RiskRuleSchema>;
export type TimeStudy = z.infer<typeof TimeStudySchema>;
export type MLSuggestion = z.infer<typeof MLSuggestionSchema>;

// Catalog Management Schemas
export const MachineSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC_Milling', 'CNC_Turning', '5-Axis', 'Waterjet', 'Laser', 'PressBrake']),
  axes: z.number().int().min(3).max(5),
  region: z.enum(['USA', 'International']),
  itar_approved: z.boolean(),
  envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  min_tool_diameter_mm: z.number().positive().optional(),
  max_spindle_rpm: z.number().positive().optional(),
  max_feed_mm_per_min: z.number().positive().optional(),
  fixture_types: z.array(z.string()),
  supported_ops: z.array(z.string()),
  hourly_rate_usd: z.number().min(10),
  setup_time_min: z.number().min(0),
  changeover_cost_usd: z.number().min(0).optional(),
  maintenance_overhead_pct: z.number().min(0).max(100).optional(),
  risk_multiplier: z.number().min(0.1).max(5).default(1.0),
  constraints: z.object({
    min_corner_radius_mm: z.number().positive().optional(),
    max_depth_to_toolD_ratio: z.number().positive().optional(),
    min_clamp_pad_mm: z.number().positive().optional(),
    material_blacklist: z.array(z.string()),
    finish_blacklist: z.array(z.string()),
  }),
  availability: z.object({
    status: z.enum(['Available', 'Maintenance', 'Decommissioned']),
    calendar_blackouts: z.array(z.string().datetime()),
    capacity_hours_per_week: z.number().positive(),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  grade: z.string(),
  family: z.enum(['Aluminum', 'Steel', 'Stainless', 'Titanium', 'Brass', 'Copper', 'Plastic']),
  spec: z.string().optional(),
  processes: z.array(z.enum(['CNC', 'SheetMetal', 'InjectionMolding'])),
  region: z.enum(['USA', 'International']),
  density_g_cc: z.number().positive().optional(),
  yield_strength_mpa: z.number().positive().optional(),
  hardness_hb: z.number().positive().optional(),
  ctexp_um_mC: z.number().optional(),
  machinability_1_5: z.number().int().min(1).max(5),
  stock_forms: z.array(z.enum(['Plate', 'Bar', 'Rod', 'Sheet', 'Block'])),
  thickness_range_mm: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  buy_price_usd_per_kg: z.number().positive(),
  waste_factor_pct: z.number().min(0).max(100).default(15),
  min_lot_charge_usd: z.number().min(0).optional(),
  min_wall_mm: z.number().positive().optional(),
  compatible_finishes: z.array(z.string().uuid()),
  finish_exclusions: z.array(z.string().uuid()),
  retired: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const FinishSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  process: z.enum(['Anodize', 'PowderCoat', 'BeadBlast', 'Passivation', 'Electropolish', 'BlackOxide', 'Painting']),
  class_spec: z.string().optional(),
  cosmetic_class: z.enum(['Industrial', 'Cosmetic A', 'Cosmetic AA']).optional(),
  color_system: z.enum(['RAL', 'Pantone', 'N/A']).optional(),
  color_codes: z.array(z.string()),
  thickness_um_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  surface_prep_required: z.boolean().default(false),
  masking_supported: z.boolean().default(false),
  thread_protection_rule: z.enum(['Mask Threads', 'Re-tap After', 'No Threads Allowed']),
  max_envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  material_whitelist: z.array(z.string()),
  material_blacklist: z.array(z.string()),
  cost_model: z.enum(['PerPart', 'PerArea', 'PerVolume', 'LotCharge+PerPart']),
  min_charge_usd: z.number().min(0),
  rate_per_part_usd: z.number().min(0).optional(),
  rate_per_area_usd_m2: z.number().min(0).optional(),
  rate_per_volume_usd_dm3: z.number().min(0).optional(),
  lead_time_days: z.number().min(0),
  expedite_supported: z.boolean().default(false),
  disabled: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const InspectionTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['Standard', 'Formal+DimReport', 'CMM', 'FAIR_AS9102', 'Source', 'Custom']),
  requires_drawing: z.boolean().default(false),
  max_dimensions: z.number().int().positive(),
  sampling_plan: z.enum(['100%', 'AQL 1.0', 'AQL 2.5', 'SPC (n per lot)']),
  deliverables: z.array(z.enum(['Dimensional Report', 'CMM Report', 'FAIR (AS9102)', 'Material Certs', 'CoC', 'Photos'])),
  base_cost_usd: z.number().min(0),
  cost_per_dim_usd: z.number().min(0),
  lead_time_days: z.number().min(0),
  rules: z.object({
    requires_drawing_if_over_dims: z.number().int().positive().optional(),
    requires_material_cert: z.boolean().default(false),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const QAPTemplateSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC', 'SheetMetal', 'InjectionMolding']),
  industry: z.enum(['General', 'Aerospace', 'Medical', 'Automotive']),
  rev: z.string(),
  owner_user_id: z.string().uuid(),
  variables: z.record(z.unknown()),
  steps: z.array(z.object({
    title: z.string(),
    description_md: z.string(),
    responsible_role: z.string(),
    gate: z.boolean(),
  })),
  checkpoints: z.array(z.object({
    name: z.string(),
    type: z.string(),
    frequency: z.string(),
    sampling: z.string(),
  })),
  required_docs: z.array(z.enum(['CoC', 'Material Cert', 'Dimensional Report', 'FAIR', 'CMM', 'Photos'])),
  packaging_instructions: z.string().optional(),
  labeling_rules: z.string().optional(),
  signoffs: z.array(z.object({
    role: z.string(),
    name: z.string().optional(),
    signature_required: z.boolean(),
  })),
  published: z.boolean().default(false),
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
export type Address = z.infer<typeof AddressSchema>;
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type DocRef = z.infer<typeof DocRefSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type QapDocument = z.infer<typeof QapDocumentSchema>;

// New type exports for Documents/Files and Pricing Operations
export type FileMeta = z.infer<typeof FileMetaSchema>;
export type QAPDocument = z.infer<typeof QAPDocumentSchemaV2>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type FAIRReport = z.infer<typeof FAIRReportSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type RateCardMachine = z.infer<typeof RateCardMachineSchema>;
export type RateCardMaterial = z.infer<typeof RateCardMaterialSchema>;
export type RateCardFinish = z.infer<typeof RateCardFinishSchema>;
export type FeatureMultiplier = z.infer<typeof FeatureMultiplierSchema>;
export type RiskRule = z.infer<typeof RiskRuleSchema>;
export type TimeStudy = z.infer<typeof TimeStudySchema>;
export type MLSuggestion = z.infer<typeof MLSuggestionSchema>;

// Catalog Management Schemas
export const MachineSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC_Milling', 'CNC_Turning', '5-Axis', 'Waterjet', 'Laser', 'PressBrake']),
  axes: z.number().int().min(3).max(5),
  region: z.enum(['USA', 'International']),
  itar_approved: z.boolean(),
  envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  min_tool_diameter_mm: z.number().positive().optional(),
  max_spindle_rpm: z.number().positive().optional(),
  max_feed_mm_per_min: z.number().positive().optional(),
  fixture_types: z.array(z.string()),
  supported_ops: z.array(z.string()),
  hourly_rate_usd: z.number().min(10),
  setup_time_min: z.number().min(0),
  changeover_cost_usd: z.number().min(0).optional(),
  maintenance_overhead_pct: z.number().min(0).max(100).optional(),
  risk_multiplier: z.number().min(0.1).max(5).default(1.0),
  constraints: z.object({
    min_corner_radius_mm: z.number().positive().optional(),
    max_depth_to_toolD_ratio: z.number().positive().optional(),
    min_clamp_pad_mm: z.number().positive().optional(),
    material_blacklist: z.array(z.string()),
    finish_blacklist: z.array(z.string()),
  }),
  availability: z.object({
    status: z.enum(['Available', 'Maintenance', 'Decommissioned']),
    calendar_blackouts: z.array(z.string().datetime()),
    capacity_hours_per_week: z.number().positive(),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  grade: z.string(),
  family: z.enum(['Aluminum', 'Steel', 'Stainless', 'Titanium', 'Brass', 'Copper', 'Plastic']),
  spec: z.string().optional(),
  processes: z.array(z.enum(['CNC', 'SheetMetal', 'InjectionMolding'])),
  region: z.enum(['USA', 'International']),
  density_g_cc: z.number().positive().optional(),
  yield_strength_mpa: z.number().positive().optional(),
  hardness_hb: z.number().positive().optional(),
  ctexp_um_mC: z.number().optional(),
  machinability_1_5: z.number().int().min(1).max(5),
  stock_forms: z.array(z.enum(['Plate', 'Bar', 'Rod', 'Sheet', 'Block'])),
  thickness_range_mm: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  buy_price_usd_per_kg: z.number().positive(),
  waste_factor_pct: z.number().min(0).max(100).default(15),
  min_lot_charge_usd: z.number().min(0).optional(),
  min_wall_mm: z.number().positive().optional(),
  compatible_finishes: z.array(z.string().uuid()),
  finish_exclusions: z.array(z.string().uuid()),
  retired: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const FinishSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  process: z.enum(['Anodize', 'PowderCoat', 'BeadBlast', 'Passivation', 'Electropolish', 'BlackOxide', 'Painting']),
  class_spec: z.string().optional(),
  cosmetic_class: z.enum(['Industrial', 'Cosmetic A', 'Cosmetic AA']).optional(),
  color_system: z.enum(['RAL', 'Pantone', 'N/A']).optional(),
  color_codes: z.array(z.string()),
  thickness_um_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  surface_prep_required: z.boolean().default(false),
  masking_supported: z.boolean().default(false),
  thread_protection_rule: z.enum(['Mask Threads', 'Re-tap After', 'No Threads Allowed']),
  max_envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  material_whitelist: z.array(z.string()),
  material_blacklist: z.array(z.string()),
  cost_model: z.enum(['PerPart', 'PerArea', 'PerVolume', 'LotCharge+PerPart']),
  min_charge_usd: z.number().min(0),
  rate_per_part_usd: z.number().min(0).optional(),
  rate_per_area_usd_m2: z.number().min(0).optional(),
  rate_per_volume_usd_dm3: z.number().min(0).optional(),
  lead_time_days: z.number().min(0),
  expedite_supported: z.boolean().default(false),
  disabled: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const InspectionTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['Standard', 'Formal+DimReport', 'CMM', 'FAIR_AS9102', 'Source', 'Custom']),
  requires_drawing: z.boolean().default(false),
  max_dimensions: z.number().int().positive(),
  sampling_plan: z.enum(['100%', 'AQL 1.0', 'AQL 2.5', 'SPC (n per lot)']),
  deliverables: z.array(z.enum(['Dimensional Report', 'CMM Report', 'FAIR (AS9102)', 'Material Certs', 'CoC', 'Photos'])),
  base_cost_usd: z.number().min(0),
  cost_per_dim_usd: z.number().min(0),
  lead_time_days: z.number().min(0),
  rules: z.object({
    requires_drawing_if_over_dims: z.number().int().positive().optional(),
    requires_material_cert: z.boolean().default(false),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const QAPTemplateSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC', 'SheetMetal', 'InjectionMolding']),
  industry: z.enum(['General', 'Aerospace', 'Medical', 'Automotive']),
  rev: z.string(),
  owner_user_id: z.string().uuid(),
  variables: z.record(z.unknown()),
  steps: z.array(z.object({
    title: z.string(),
    description_md: z.string(),
    responsible_role: z.string(),
    gate: z.boolean(),
  })),
  checkpoints: z.array(z.object({
    name: z.string(),
    type: z.string(),
    frequency: z.string(),
    sampling: z.string(),
  })),
  required_docs: z.array(z.enum(['CoC', 'Material Cert', 'Dimensional Report', 'FAIR', 'CMM', 'Photos'])),
  packaging_instructions: z.string().optional(),
  labeling_rules: z.string().optional(),
  signoffs: z.array(z.object({
    role: z.string(),
    name: z.string().optional(),
    signature_required: z.boolean(),
  })),
  published: z.boolean().default(false),
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
export type Address = z.infer<typeof AddressSchema>;
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type DocRef = z.infer<typeof DocRefSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type QapDocument = z.infer<typeof QapDocumentSchema>;

// New type exports for Documents/Files and Pricing Operations
export type FileMeta = z.infer<typeof FileMetaSchema>;
export type QAPDocument = z.infer<typeof QAPDocumentSchemaV2>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type FAIRReport = z.infer<typeof FAIRReportSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type RateCardMachine = z.infer<typeof RateCardMachineSchema>;
export type RateCardMaterial = z.infer<typeof RateCardMaterialSchema>;
export type RateCardFinish = z.infer<typeof RateCardFinishSchema>;
export type FeatureMultiplier = z.infer<typeof FeatureMultiplierSchema>;
export type RiskRule = z.infer<typeof RiskRuleSchema>;
export type TimeStudy = z.infer<typeof TimeStudySchema>;
export type MLSuggestion = z.infer<typeof MLSuggestionSchema>;

// Catalog Management Schemas
export const MachineSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC_Milling', 'CNC_Turning', '5-Axis', 'Waterjet', 'Laser', 'PressBrake']),
  axes: z.number().int().min(3).max(5),
  region: z.enum(['USA', 'International']),
  itar_approved: z.boolean(),
  envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  min_tool_diameter_mm: z.number().positive().optional(),
  max_spindle_rpm: z.number().positive().optional(),
  max_feed_mm_per_min: z.number().positive().optional(),
  fixture_types: z.array(z.string()),
  supported_ops: z.array(z.string()),
  hourly_rate_usd: z.number().min(10),
  setup_time_min: z.number().min(0),
  changeover_cost_usd: z.number().min(0).optional(),
  maintenance_overhead_pct: z.number().min(0).max(100).optional(),
  risk_multiplier: z.number().min(0.1).max(5).default(1.0),
  constraints: z.object({
    min_corner_radius_mm: z.number().positive().optional(),
    max_depth_to_toolD_ratio: z.number().positive().optional(),
    min_clamp_pad_mm: z.number().positive().optional(),
    material_blacklist: z.array(z.string()),
    finish_blacklist: z.array(z.string()),
  }),
  availability: z.object({
    status: z.enum(['Available', 'Maintenance', 'Decommissioned']),
    calendar_blackouts: z.array(z.string().datetime()),
    capacity_hours_per_week: z.number().positive(),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  grade: z.string(),
  family: z.enum(['Aluminum', 'Steel', 'Stainless', 'Titanium', 'Brass', 'Copper', 'Plastic']),
  spec: z.string().optional(),
  processes: z.array(z.enum(['CNC', 'SheetMetal', 'InjectionMolding'])),
  region: z.enum(['USA', 'International']),
  density_g_cc: z.number().positive().optional(),
  yield_strength_mpa: z.number().positive().optional(),
  hardness_hb: z.number().positive().optional(),
  ctexp_um_mC: z.number().optional(),
  machinability_1_5: z.number().int().min(1).max(5),
  stock_forms: z.array(z.enum(['Plate', 'Bar', 'Rod', 'Sheet', 'Block'])),
  thickness_range_mm: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  buy_price_usd_per_kg: z.number().positive(),
  waste_factor_pct: z.number().min(0).max(100).default(15),
  min_lot_charge_usd: z.number().min(0).optional(),
  min_wall_mm: z.number().positive().optional(),
  compatible_finishes: z.array(z.string().uuid()),
  finish_exclusions: z.array(z.string().uuid()),
  retired: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const FinishSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  process: z.enum(['Anodize', 'PowderCoat', 'BeadBlast', 'Passivation', 'Electropolish', 'BlackOxide', 'Painting']),
  class_spec: z.string().optional(),
  cosmetic_class: z.enum(['Industrial', 'Cosmetic A', 'Cosmetic AA']).optional(),
  color_system: z.enum(['RAL', 'Pantone', 'N/A']).optional(),
  color_codes: z.array(z.string()),
  thickness_um_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  surface_prep_required: z.boolean().default(false),
  masking_supported: z.boolean().default(false),
  thread_protection_rule: z.enum(['Mask Threads', 'Re-tap After', 'No Threads Allowed']),
  max_envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  material_whitelist: z.array(z.string()),
  material_blacklist: z.array(z.string()),
  cost_model: z.enum(['PerPart', 'PerArea', 'PerVolume', 'LotCharge+PerPart']),
  min_charge_usd: z.number().min(0),
  rate_per_part_usd: z.number().min(0).optional(),
  rate_per_area_usd_m2: z.number().min(0).optional(),
  rate_per_volume_usd_dm3: z.number().min(0).optional(),
  lead_time_days: z.number().min(0),
  expedite_supported: z.boolean().default(false),
  disabled: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const InspectionTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['Standard', 'Formal+DimReport', 'CMM', 'FAIR_AS9102', 'Source', 'Custom']),
  requires_drawing: z.boolean().default(false),
  max_dimensions: z.number().int().positive(),
  sampling_plan: z.enum(['100%', 'AQL 1.0', 'AQL 2.5', 'SPC (n per lot)']),
  deliverables: z.array(z.enum(['Dimensional Report', 'CMM Report', 'FAIR (AS9102)', 'Material Certs', 'CoC', 'Photos'])),
  base_cost_usd: z.number().min(0),
  cost_per_dim_usd: z.number().min(0),
  lead_time_days: z.number().min(0),
  rules: z.object({
    requires_drawing_if_over_dims: z.number().int().positive().optional(),
    requires_material_cert: z.boolean().default(false),
  }),
  archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const QAPTemplateSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC', 'SheetMetal', 'InjectionMolding']),
  industry: z.enum(['General', 'Aerospace', 'Medical', 'Automotive']),
  rev: z.string(),
  owner_user_id: z.string().uuid(),
  variables: z.record(z.unknown()),
  steps: z.array(z.object({
    title: z.string(),
    description_md: z.string(),
    responsible_role: z.string(),
    gate: z.boolean(),
  })),
  checkpoints: z.array(z.object({
    name: z.string(),
    type: z.string(),
    frequency: z.string(),
    sampling: z.string(),
  })),
  required_docs: z.array(z.enum(['CoC', 'Material Cert', 'Dimensional Report', 'FAIR', 'CMM', 'Photos'])),
  packaging_instructions: z.string().optional(),
  labeling_rules: z.string().optional(),
  signoffs: z.array(z.object({
    role: z.string(),
    name: z.string().optional(),
    signature_required: z.boolean(),
  })),
  published: z.boolean().default(false),
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
export type Address = z.infer<typeof AddressSchema>;
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type DocRef = z.infer<typeof DocRefSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type QapDocument = z.infer<typeof QapDocumentSchema>;

// New type exports for Documents/Files and Pricing Operations
export type FileMeta = z.infer<typeof FileMetaSchema>;
export type QAPDocument = z.infer<typeof QAPDocumentSchemaV2>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type FAIRReport = z.infer<typeof FAIRReportSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type RateCardMachine = z.infer<typeof RateCardMachineSchema>;
export type RateCardMaterial = z.infer<typeof RateCardMaterialSchema>;
export type RateCardFinish = z.infer<typeof RateCardFinishSchema>;
export type FeatureMultiplier = z.infer<typeof FeatureMultiplierSchema>;
export type RiskRule = z.infer<typeof RiskRuleSchema>;
export type TimeStudy = z.infer<typeof TimeStudySchema>;
export type MLSuggestion = z.infer<typeof MLSuggestionSchema>;

// Catalog Management Schemas
export const MachineSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  process: z.enum(['CNC_Milling', 'CNC_Turning', '5-Axis', 'Waterjet', 'Laser', 'PressBrake']),
  axes: z.number().int().min(3).max(5),
  region: z.enum(['USA', 'International']),
  itar_approved: z.boolean(),
  envelope_mm: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  min_tool_diameter_mm: z.number().positive().optional(),
  max_spindle_rpm: z.number().positive().optional(),
  max_feed_mm_per_min: z.number().positive().optional(),
  fixture_types: z.array(z.string()),
  supported_ops: z.array(z.string()),
  hourly_rate_usd: z.number().min(10),});

export type Machine = z.infer<typeof MachineSchema>;

});

export type Machine = z.infer<typeof MachineSchema>;
