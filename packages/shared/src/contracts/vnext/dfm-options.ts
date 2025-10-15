import { z } from 'zod';

const isoTimestamp = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  { message: 'Expected ISO 8601 timestamp string' },
);

export const DfmOptionVNextSchema = z
  .object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  published: z.boolean(),
  publishedAt: z.string().nullable().optional(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  })
  .passthrough();

export const ToleranceListVNextSchema = z.array(DfmOptionVNextSchema);
export const FinishListVNextSchema = z.array(DfmOptionVNextSchema);
export const IndustryListVNextSchema = z.array(DfmOptionVNextSchema);
export const CertificationListVNextSchema = z.array(DfmOptionVNextSchema);
export const CriticalityListVNextSchema = z.array(DfmOptionVNextSchema);

export const DfmMaterialOptionVNextSchema = z
  .object({
    id: z.string(),
    code: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    is_metal: z.boolean().nullable().optional(),
    density_g_cm3: z.number().nullable().optional(),
    elastic_modulus_gpa: z.number().nullable().optional(),
    hardness_hv: z.number().nullable().optional(),
    max_operating_temp_c: z.number().nullable().optional(),
    machinability_rating: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough();

export const MaterialListVNextSchema = z.array(DfmMaterialOptionVNextSchema);

export type DfmOptionVNext = z.infer<typeof DfmOptionVNextSchema>;
export type DfmOptionListVNext = Array<DfmOptionVNext>;
export type DfmMaterialOptionVNext = z.infer<typeof DfmMaterialOptionVNextSchema>;
export type DfmMaterialListVNext = Array<DfmMaterialOptionVNext>;
