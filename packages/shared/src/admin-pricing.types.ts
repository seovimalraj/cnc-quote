import { z } from 'zod';

const EnvelopeSchema = z.object({
  x: z.number().nullable().optional(),
  y: z.number().nullable().optional(),
  z: z.number().nullable().optional(),
});

export const AdminMachineConfigSchema = z.object({
  profile_id: z.string().uuid().optional(),
  machine_id: z.string().uuid().optional(),
  name: z.string().optional(),
  axes: z.number().int().nonnegative().nullable().optional(),
  envelope: EnvelopeSchema.optional(),
  hourly_rate: z.number().nonnegative(),
  setup_rate: z.number().nonnegative(),
  min_setup_min: z.number().nonnegative(),
  feed_rate_map: z.record(z.number()).default({}),
  rapid_rate: z.number().nullable().optional(),
  toolchange_s: z.number().nullable().optional(),
  region: z.string().optional(),
  capacity: z.number().min(0).max(1).nullable().optional(),
});

export const AdminMaterialConfigSchema = z.object({
  material_id: z.string().uuid().optional(),
  grade: z.string(),
  density_kg_m3: z.number().nonnegative().nullable().optional(),
  buy_price: z.number().nonnegative().nullable().optional(),
  stock_forms: z.array(z.string()).default([]),
  waste_factor_percent: z.number().nonnegative().nullable().optional(),
  finish_compat: z.array(z.string()).default([]),
  min_wall_mm: z.number().nullable().optional(),
  min_hole_mm: z.number().nullable().optional(),
  machinability: z.number().nullable().optional(),
});

export const AdminFinishConfigSchema = z.object({
  finish_id: z.string().uuid().optional(),
  model: z.enum(['per_area', 'per_part', 'tiered']).optional(),
  rate: z.number().nonnegative().nullable().optional(),
  min_lot: z.number().nonnegative().nullable().optional(),
  capacity_dims: z.object({ max_area: z.number().nullable().optional() }).optional(),
  leadtime_add: z.number().nullable().optional(),
  region_allowed: z.array(z.string()).default([]),
});

export const AdminTolerancePackConfigSchema = z.object({
  tolerance_id: z.string().uuid().optional(),
  cycle_time_multiplier: z.number().nonnegative().nullable().optional(),
  surface_default: z.number().nonnegative().nullable().optional(),
  inspection_requirements: z.string().optional(),
});

export const AdminInspectionConfigSchema = z.object({
  base_usd: z.number().nonnegative(),
  per_dim_usd: z.number().nonnegative(),
  program_min: z.number().nonnegative(),
});

export const AdminSpeedRegionConfigSchema = z.object({
  multiplier: z.number().nonnegative(),
  leadtime_days: z.number().nonnegative(),
});

export const AdminRiskConfigSchema = z.object({
  time_multiplier: z.number().nonnegative().nullable().optional(),
  risk_percent: z.number().nullable().optional(),
  risk_flat: z.number().nullable().optional(),
});

export const AdminOverheadMarginConfigSchema = z.object({
  overhead_percent: z.number(),
  target_margin_percent: z.number(),
});

export const AdminPricingConfigSchema = z.object({
  version: z.string(),
  machines: z.record(AdminMachineConfigSchema),
  materials: z.record(AdminMaterialConfigSchema),
  finishes: z.record(AdminFinishConfigSchema),
  tolerance_packs: z.record(AdminTolerancePackConfigSchema),
  inspection: AdminInspectionConfigSchema,
  speed_region: z.record(z.record(AdminSpeedRegionConfigSchema)).default({}),
  risk_matrix: z.record(AdminRiskConfigSchema),
  overhead_margin: AdminOverheadMarginConfigSchema,
});

export type AdminMachineConfig = z.infer<typeof AdminMachineConfigSchema>;
export type AdminMaterialConfig = z.infer<typeof AdminMaterialConfigSchema>;
export type AdminFinishConfig = z.infer<typeof AdminFinishConfigSchema>;
export type AdminTolerancePackConfig = z.infer<typeof AdminTolerancePackConfigSchema>;
export type AdminInspectionConfig = z.infer<typeof AdminInspectionConfigSchema>;
export type AdminSpeedRegionConfig = z.infer<typeof AdminSpeedRegionConfigSchema>;
export type AdminRiskConfig = z.infer<typeof AdminRiskConfigSchema>;
export type AdminOverheadMarginConfig = z.infer<typeof AdminOverheadMarginConfigSchema>;
export type AdminPricingConfig = z.infer<typeof AdminPricingConfigSchema>;
