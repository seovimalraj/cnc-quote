export enum Severity {
  WARN = 'warn',
  BLOCK = 'block',
}

export interface DfmRule {
  id: string;
  name: string;
  description: string;
  process_type: 'cnc' | 'sheet_metal' | 'injection_molding';
  severity: Severity;
  condition: string; // expr-eval compatible expression
  message: string;
  triggers_manual_review: boolean;
}

export interface DfmValidationIssue {
  rule_id: string;
  name: string;
  severity: Severity;
  message: string;
  details?: Record<string, unknown>;
  location?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface DfmValidationResponse {
  valid: boolean;
  issues: DfmValidationIssue[];
  manual_review_required: boolean;
}

export interface CncDfmParams {
  min_wall_thickness: number;
  max_tool_reach_depth: number;
  drill_grid_spacing: number;
  slot_aspect_ratio: number;
  pocket_aspect_ratio: number;
}

export interface SheetMetalDfmParams {
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

export interface InjectionMoldingDfmParams {
  clamp_tonnage: number;
  shot_size_cc: number;
  min_draft_angle: number;
  min_wall_thickness: number;
  max_wall_thickness: number;
  max_wall_ratio: number;
  undercut_count: number;
  side_action_count: number;
}
