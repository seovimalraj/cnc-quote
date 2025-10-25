import { z } from 'zod';

export const SupplierEnvelopeSchemaV1 = z.object({
  min_length_mm: z.number().nonnegative().optional(),
  min_width_mm: z.number().nonnegative().optional(),
  min_height_mm: z.number().nonnegative().optional(),
  max_length_mm: z.number().positive().optional(),
  max_width_mm: z.number().positive().optional(),
  max_height_mm: z.number().positive().optional(),
});

export const SupplierCapabilitySchemaV1 = z.object({
  version: z.literal(1),
  orgId: z.string(),
  supplierId: z.string(),
  processes: z.array(z.string()).min(1),
  materials: z.array(z.string()).default([]),
  machineGroups: z.array(z.string()).default([]),
  throughputPerWeek: z.number().int().nonnegative().default(0),
  leadDays: z.number().int().nonnegative().default(0),
  certifications: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  envelope: SupplierEnvelopeSchemaV1.optional(),
  notes: z.string().max(2000).optional(),
  active: z.boolean().default(true),
  updatedBy: z.string().nullable().optional(),
  updatedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
});

export type SupplierCapabilityV1 = z.infer<typeof SupplierCapabilitySchemaV1>;

export const SupplierApprovalSchemaV1 = z.object({
  version: z.literal(1),
  orgId: z.string(),
  supplierId: z.string(),
  quoteId: z.string(),
  approved: z.boolean(),
  capacityCommitment: z.number().int().nonnegative().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type SupplierApprovalV1 = z.infer<typeof SupplierApprovalSchemaV1>;

export const SupplierEventKindV1 = z.enum([
  'SupplierCapabilityUpdated',
  'SupplierApprovalRecorded',
]);

export type SupplierEventKindV1 = z.infer<typeof SupplierEventKindV1>;

export const SupplierCapabilityUpdatedEventSchemaV1 = z.object({
  kind: z.literal('SupplierCapabilityUpdated'),
  orgId: z.string(),
  supplierId: z.string(),
  // Use explicit key/value types to satisfy zod@4 classic signature and strict typing
  diff: z.record(z.string(), z.unknown()).optional(),
  at: z.string().datetime(),
});

export type SupplierCapabilityUpdatedEventV1 = z.infer<typeof SupplierCapabilityUpdatedEventSchemaV1>;

export const SupplierApprovalRecordedEventSchemaV1 = z.object({
  kind: z.literal('SupplierApprovalRecorded'),
  orgId: z.string(),
  supplierId: z.string(),
  quoteId: z.string(),
  approved: z.boolean(),
  at: z.string().datetime(),
});

export type SupplierApprovalRecordedEventV1 = z.infer<typeof SupplierApprovalRecordedEventSchemaV1>;
