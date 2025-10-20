import { z } from 'zod';

import { QuoteLifecycleStatusVNextSchema } from './contracts/vnext';

/**
 * Step 17: Marketplace v0 - Shared Types
 * Types for suppliers, capabilities, routing rules, and order assignment
 */

export const SUPPLIER_PORTAL_VERSION_HEADER = 'x-supplier-portal-version' as const;
export const SUPPLIER_PORTAL_VERSION = 'supplier-portal.v1' as const;

// Enums
export const CERTIFICATION_VALUES = [
  'ISO9001',
  'AS9100',
  'ITAR',
  'ISO13485',
  'IATF16949',
  'NONE',
] as const;
export const CertificationSchema = z.enum(CERTIFICATION_VALUES);
export type Certification = z.infer<typeof CertificationSchema>;

export const PROCESS_VALUES = [
  'CNC_MILLING',
  'CNC_TURNING',
  'SHEET_METAL',
  'INJECTION_MOLDING',
  'CASTING',
  'ADDITIVE',
  'URETHANE',
] as const;
export const ProcessSchema = z.enum(PROCESS_VALUES);
export type Process = z.infer<typeof ProcessSchema>;

// Process envelope and capability
export const ProcessEnvelopeSchema = z.object({
  maxX: z.number(),
  maxY: z.number(),
  maxZ: z.number(),
  maxMassKg: z.number().optional(),
  tolerances: z
    .object({
      general: z.number().optional(),
      hole: z.number().optional(),
    })
    .optional(),
  threadSupport: z.boolean().optional(),
});
export type ProcessEnvelope = z.infer<typeof ProcessEnvelopeSchema>;

export const CapabilitySchema = z.object({
  id: z.string().optional(),
  process: ProcessSchema,
  envelope: ProcessEnvelopeSchema,
  materials: z.array(z.string()),
  finishes: z.array(z.string()).optional(),
  minQty: z.number().optional(),
  maxQty: z.number().optional(),
  leadtimeDaysMin: z.number().optional(),
  leadtimeDaysMax: z.number().optional(),
  unitCostIndex: z.number().optional(),
});
export type Capability = z.infer<typeof CapabilitySchema>;

// Supplier profile
export const SupplierProfileSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  regions: z.array(z.string()),
  certifications: z.array(CertificationSchema),
  rating: z.number(),
  active: z.boolean(),
  notes: z.string().optional().nullable(),
  capabilities: z.array(CapabilitySchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupplierProfile = z.infer<typeof SupplierProfileSchema>;

export const CreateSupplierDtoSchema = z.object({
  name: z.string().min(2),
  regions: z.array(z.string()).min(1),
  certifications: z.array(CertificationSchema).optional(),
  rating: z.number().optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
  capabilities: z.array(CapabilitySchema.omit({ id: true })).optional(),
});
export type CreateSupplierDto = z.infer<typeof CreateSupplierDtoSchema>;

export const UpdateSupplierDtoSchema = CreateSupplierDtoSchema.partial();
export type UpdateSupplierDto = z.infer<typeof UpdateSupplierDtoSchema>;

// Routing rules
export type RuleOperator =
  | 'EQ'
  | 'NEQ'
  | 'IN'
  | 'NIN'
  | 'GTE'
  | 'LTE'
  | 'GT'
  | 'LT'
  | 'HAS_ALL'
  | 'HAS_ANY'
  | 'CONTAINS';

export interface Comparison {
  field: string;
  op: RuleOperator;
  value: any;
}

export interface RuleAst {
  all?: RuleAst[];
  any?: RuleAst[];
  not?: RuleAst;
  expr?: Comparison;
}

export interface RoutingRule {
  id: string;
  orgId: string;
  name: string;
  priority: number;
  active: boolean;
  rule: RuleAst;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoutingRuleDto {
  name: string;
  priority?: number;
  rule: RuleAst;
  active?: boolean;
}

// Candidate scoring
export interface CandidateScore {
  supplierId: string;
  supplierName: string;
  supplierRegions?: string[];
  supplierCertifications?: Certification[];
  supplierRating?: number;
  score: number;
  reasons: string[];
  hardBlocks: string[];
  softPenalties: string[];
  penalties?: string[]; // Alias for softPenalties (backward compat)
  capability?: Capability;
}

export interface GetCandidatesDto {
  orderId: string;
  process: Process;
  material: string;
  quantity: number;
  region?: string;
  geometry?: {
    bbox: {
      x: number;
      y: number;
      z: number;
    };
    massKg?: number;
    threads?: boolean;
  };
  flags?: string[];
  tolerances?: {
    general?: number;
    hole?: number;
  };
  finishes?: string[];
}

export interface CandidatesResponse {
  candidates: CandidateScore[];
  orderId: string;
  totalEvaluated: number;
  matchCount: number;
}

// Order assignment
export interface AssignSupplierDto {
  supplierId: string;
  note?: string;
}

export interface AssignSupplierResponse {
  status: 'ok';
  orderId: string;
  supplierId: string;
  routedAt: string;
  routedBy: string;
}

// Supplier files
export const FILE_KIND_VALUES = ['NDA', 'MSA', 'CERT', 'ISO', 'OTHER'] as const;
export const FileKindSchema = z.enum(FILE_KIND_VALUES);
export type FileKind = z.infer<typeof FileKindSchema>;

export const SupplierFileSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  fileId: z.string(),
  kind: FileKindSchema,
  createdAt: z.string(),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
});
export type SupplierFile = z.infer<typeof SupplierFileSchema>;

export const AttachFileDtoSchema = z.object({
  fileId: z.string(),
  kind: FileKindSchema,
});
export type AttachFileDto = z.infer<typeof AttachFileDtoSchema>;

// Supplier portal responses
export const SUPPLIER_ORDER_STATUS_VALUES = [
  'new',
  'in_production',
  'qa',
  'packed',
  'shipped',
  'complete',
  'hold',
] as const;
export const SupplierOrderStatusSchema = z.enum(SUPPLIER_ORDER_STATUS_VALUES);
export type SupplierOrderStatus = z.infer<typeof SupplierOrderStatusSchema>;

export const SupplierQuoteStatusSchema = z.union([
  QuoteLifecycleStatusVNextSchema,
  SupplierOrderStatusSchema,
]);
export type SupplierQuoteStatus = z.infer<typeof SupplierQuoteStatusSchema>;

export const SupplierQuoteListItemSchema = z.object({
  orderId: z.string(),
  quoteId: z.string(),
  status: SupplierQuoteStatusSchema,
  totalAmount: z.number().nullable(),
  currency: z.string(),
  customerId: z.string().nullable(),
  routedAt: z.string().nullable(),
  updatedAt: z.string(),
  expiresAt: z.string().nullable(),
});
export type SupplierQuoteListItem = z.infer<typeof SupplierQuoteListItemSchema>;

export const SupplierProfileRespV1Schema = z.object({
  portalVersion: z.literal(SUPPLIER_PORTAL_VERSION),
  hydratedAt: z.string(),
  supplier: SupplierProfileSchema,
});
export type SupplierProfileRespV1 = z.infer<typeof SupplierProfileRespV1Schema>;

export const SupplierQuotesRespV1Schema = z.object({
  portalVersion: z.literal(SUPPLIER_PORTAL_VERSION),
  hydratedAt: z.string(),
  quotes: z.array(SupplierQuoteListItemSchema),
});
export type SupplierQuotesRespV1 = z.infer<typeof SupplierQuotesRespV1Schema>;

// Websocket events
export interface OrderRoutedEvent {
  orderId: string;
  supplierId: string;
  supplierName: string;
  routedBy: string;
  routedAt: string;
}
