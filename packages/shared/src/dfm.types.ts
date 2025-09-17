import { z } from 'zod';

// Enhanced DFM Types with Zod schemas

// Severity Enum
export const SeveritySchema = z.enum(['warn', 'block']);
export type Severity = z.infer<typeof SeveritySchema>;

// DFM Rule Schema
export const DfmRuleSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  process_type: z.enum(['cnc', 'sheet_metal', 'injection_molding']),
  severity: SeveritySchema,
  condition: z.string(), // JSON logic expression or eval-eval compatible expression
  message: z.string(),
  triggers_manual_review: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// DFM Validation Issue Schema
export const DfmValidationIssueSchema = z.object({
  rule_id: z.string().uuid(),
  name: z.string(),
  severity: SeveritySchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  location: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }).optional(),
  suggestion: z.string().optional(),
});

// DFM Validation Response Schema
export const DfmValidationResponseSchema = z.object({
  valid: z.boolean(),
  issues: z.array(DfmValidationIssueSchema),
  manual_review_required: z.boolean(),
  summary: z.object({
    total_issues: z.number(),
    blocker_count: z.number(),
    warning_count: z.number(),
    info_count: z.number(),
  }).optional(),
  processing_time_ms: z.number().optional(),
});

// CNC DFM Parameters Schema
export const CncDfmParamsSchema = z.object({
  min_wall_thickness: z.number().positive(),
  max_tool_reach_depth: z.number().positive(),
  drill_grid_spacing: z.number().positive(),
  slot_aspect_ratio: z.number().positive(),
  pocket_aspect_ratio: z.number().positive(),
  min_hole_diameter: z.number().positive(),
  max_hole_depth_ratio: z.number().positive(),
  min_corner_radius: z.number().positive(),
  max_taper_angle: z.number().positive(),
  undercut_detection: z.boolean().default(true),
});

// Sheet Metal DFM Parameters Schema
export const SheetMetalDfmParamsSchema = z.object({
  min_hole_diameter: z.number().positive(),
  min_slot_width: z.number().positive(),
  material_thickness: z.number().positive(),
  min_flange_length: z.number().positive(),
  min_bend_radius: z.number().positive(),
  min_hole_to_bend: z.number().positive(),
  min_hole_to_edge: z.number().positive(),
  max_panel_size: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
  }),
  max_bend_angle: z.number().positive(),
  min_bend_relief: z.number().positive(),
});

// Injection Molding DFM Parameters Schema
export const InjectionMoldingDfmParamsSchema = z.object({
  clamp_tonnage: z.number().positive(),
  shot_size_cc: z.number().positive(),
  min_draft_angle: z.number().positive(),
  min_wall_thickness: z.number().positive(),
  max_wall_thickness: z.number().positive(),
  max_wall_ratio: z.number().positive(),
  undercut_count: z.number().nonnegative(),
  side_action_count: z.number().nonnegative(),
  min_gate_diameter: z.number().positive(),
  max_flow_length_ratio: z.number().positive(),
  weld_line_sensitivity: z.enum(['low', 'medium', 'high']),
});

// DFM Validation Request Schema
export const DfmValidationRequestSchema = z.object({
  quote_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  process_type: z.enum(['cnc', 'sheet_metal', 'injection_molding']),
  geometry_data: z.record(z.string(), z.unknown()),
  material_properties: z.record(z.string(), z.unknown()).optional(),
  design_parameters: z.record(z.string(), z.unknown()).optional(),
  skip_rules: z.array(z.string()).optional(), // Rule IDs to skip
});

// DFM Rule Evaluation Context Schema
export const DfmRuleEvaluationContextSchema = z.object({
  geometry: z.record(z.string(), z.unknown()),
  material: z.record(z.string(), z.unknown()).optional(),
  process: z.record(z.string(), z.unknown()).optional(),
  design: z.record(z.string(), z.unknown()).optional(),
  tolerances: z.record(z.string(), z.unknown()).optional(),
});

// DFM Rule Result Schema
export const DfmRuleResultSchema = z.object({
  rule_id: z.string().uuid(),
  passed: z.boolean(),
  severity: SeveritySchema.optional(),
  message: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  evaluation_time_ms: z.number(),
});

// DFM Batch Validation Schema
export const DfmBatchValidationSchema = z.object({
  requests: z.array(DfmValidationRequestSchema),
  parallel_processing: z.boolean().default(true),
  fail_fast: z.boolean().default(false),
});

// DFM Batch Validation Response Schema
export const DfmBatchValidationResponseSchema = z.object({
  results: z.array(DfmValidationResponseSchema),
  summary: z.object({
    total_requests: z.number(),
    successful_validations: z.number(),
    failed_validations: z.number(),
    total_issues: z.number(),
    manual_reviews_required: z.number(),
  }),
  processing_time_ms: z.number(),
});

// Type exports
export type DfmRule = z.infer<typeof DfmRuleSchema>;
export type DfmValidationIssue = z.infer<typeof DfmValidationIssueSchema>;
export type DfmValidationResponse = z.infer<typeof DfmValidationResponseSchema>;
export type CncDfmParams = z.infer<typeof CncDfmParamsSchema>;
export type SheetMetalDfmParams = z.infer<typeof SheetMetalDfmParamsSchema>;
export type InjectionMoldingDfmParams = z.infer<typeof InjectionMoldingDfmParamsSchema>;
export type DfmValidationRequest = z.infer<typeof DfmValidationRequestSchema>;
export type DfmRuleEvaluationContext = z.infer<typeof DfmRuleEvaluationContextSchema>;
export type DfmRuleResult = z.infer<typeof DfmRuleResultSchema>;
export type DfmBatchValidation = z.infer<typeof DfmBatchValidationSchema>;
export type DfmBatchValidationResponse = z.infer<typeof DfmBatchValidationResponseSchema>;

// Legacy interfaces for backward compatibility
export enum SeverityLegacy {
  WARN = 'warn',
  BLOCK = 'block',
}

export interface DfmRuleLegacy {
  id: string;
  name: string;
  description: string;
  process_type: 'cnc' | 'sheet_metal' | 'injection_molding';
  severity: SeverityLegacy;
  condition: string; // expr-eval compatible expression
  message: string;
  triggers_manual_review: boolean;
}

export interface DfmValidationIssueLegacy {
  rule_id: string;
  name: string;
  severity: SeverityLegacy;
  message: string;
  details?: Record<string, unknown>;
  location?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface DfmValidationResponseLegacy {
  valid: boolean;
  issues: DfmValidationIssueLegacy[];
  manual_review_required: boolean;
}

export interface CncDfmParamsLegacy {
  min_wall_thickness: number;
  max_tool_reach_depth: number;
  drill_grid_spacing: number;
  slot_aspect_ratio: number;
  pocket_aspect_ratio: number;
}

export interface SheetMetalDfmParamsLegacy {
  min_hole_diameter: number;
  min_slot_width: number;
  material_thickness: number;
  min_flange_length: number;
  min_bend_radius: number;
  min_hole_to_bend: number;
  max_panel_size: {
    x: number;
    y: number;
  };
}

export interface InjectionMoldingDfmParamsLegacy {
  clamp_tonnage: number;
  shot_size_cc: number;
  min_draft_angle: number;
  min_wall_thickness: number;
  max_wall_thickness: number;
  max_wall_ratio: number;
  undercut_count: number;
  side_action_count: number;
}
