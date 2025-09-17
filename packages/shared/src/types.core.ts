import { z } from 'zod';

// Re-export schemas
export * from './types/schema';

// Technology and Process Types
export type Technology = 'cnc' | 'sheet_metal' | 'injection_molding';
export type ProcessType = 'milling' | 'turning' | 'laser_cutting' | 'press_brake' | 'injection';

// Machine Types
export interface Machine {
  id: string;
  organization_id: string;
  name: string;
  technology: Technology;
  process_type: ProcessType;
  model: string;
  manufacturer: string;
  year: number;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface MachineSpec {
  id: string;
  machine_id: string;
  key: string;
  value: string | number;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineLimit {
  id: string;
  machine_id: string;
  dimension: 'x' | 'y' | 'z' | 'diameter';
  min: number;
  max: number;
  unit: 'mm' | 'inch';
  created_at: string;
  updated_at: string;
}

export interface MachineMessage {
  id: string;
  machine_id: string;
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  params?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Material Types
// export interface Material {
//   id: string;
//   organization_id: string;
//   name: string;
//   type: 'metal' | 'plastic' | 'composite';
//   subtype: string;
//   density: number; // kg/m³
//   cost_per_kg: number;
//   waste_factor: number; // percentage
//   min_thickness?: number;
//   max_thickness?: number;
//   available_forms: string[]; // 'sheet', 'bar', 'tube', etc.
//   created_at: string;
//   updated_at: string;
// }

// Finish Types
// export interface Finish {
//   id: string;
//   organization_id: string;
//   name: string;
//   type: 'surface' | 'coating' | 'treatment';
//   cost_per_area?: number; // cost per cm²
//   cost_per_part?: number; // flat cost per part
//   setup_time?: number; // minutes
//   processing_time?: number; // minutes per cm²
//   created_at: string;
//   updated_at: string;
// }

// Tolerance Types
// export interface Tolerance {
//   id: string;
//   organization_id: string;
//   name: string;
//   grade: 'coarse' | 'standard' | 'fine' | 'precision';
//   linear_tolerance: number; // mm
//   angular_tolerance: number; // degrees
//   cost_multiplier: number;
//   created_at: string;
//   updated_at: string;
// }

// Lead Time Types
// export interface LeadTime {
//   id: string;
//   organization_id: string;
//   name: string;
//   standard_days: number;
//   rush_days: number;
//   rush_multiplier: number;
//   created_at: string;
//   updated_at: string;
// }

// Complexity Types
export interface ComplexityRule {
  id: string;
  organization_id: string;
  name: string;
  technology: Technology;
  process_type: ProcessType;
  condition: string; // JSON logic expression
  multiplier: number;
  description: string;
  created_at: string;
  updated_at: string;
}

// Feature Types
export interface FeatureType {
  id: string;
  organization_id: string;
  name: string;
  technology: Technology;
  process_type: ProcessType;
  base_time: number; // minutes
  cost_per_unit: number;
  setup_time: number; // minutes
  created_at: string;
  updated_at: string;
}

// Pricing Profile Types
// export interface PricingProfile {
//   id: string;
//   machine_id: string;
//   setup_cost: number;
//   machine_rate_per_hour: number;
  // min_order_qty: number;
  // min_order_value: number;
  // min_price_per_part: number;
  // margin: number;
  // overhead: number;
  // rush_surcharge: number;
  // standard_lead_time: number;
  // rush_lead_time: number;
  // material_removal_rate_cc_min: number;
  // surface_finish_rate_cm2_min: number;
  // qa_cost_per_part: number;
  // cutting_speed_mm_min: number;
  // pierce_time_s: number;
  // bend_time_s: number;
  // mold_complexity_multiplier: number;
  // shot_cost: number;
  // feature_times: {
  //   hole: number;
  //   pocket: number;
  //   slot: number;
  //   face: number;
  // };
  // quantity_breaks: {
  //   min_qty: number;
  //   discount: number;
  // }[];
// }

// DFM Rule Types
// export interface DfmRule {
//   id: string;
//   organization_id: string;
//   name: string;
//   description: string;
//   process_type: 'cnc' | 'sheet_metal' | 'injection_molding';
//   severity: 'warn' | 'block';
//   condition: string;
//   message: string;
//   triggers_manual_review: boolean;
//   created_at: string;
//   updated_at: string;
// }

// Manual Review Types
export interface ManualReview {
  id: string;
  quote_id: string;
  organization_id: string;
  reviewer_id: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: string;
  review_started_at?: string;
  review_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewNote {
  id: string;
  review_id: string;
  reviewer_id: string;
  note_type: 'comment' | 'approval' | 'rejection' | 'change_request';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// QAP Template Types
export interface QapTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  template_html: string;
  schema_json: Record<string, unknown>;
  process_type: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QapDocument {
  id: string;
  order_id: string;
  template_id: string;
  document_data: Record<string, unknown>;
  status: 'draft' | 'generated' | 'approved' | 'rejected';
  generated_url?: string;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: 'quote_created' | 'quote_accepted' | 'order_status_changed' | 'payment_received' | 'review_required';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// Health Check Types
export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: string;
  metrics?: Record<string, number>;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthStatus[];
  last_updated: string;
}

// Queue Types
export interface QueueJob {
  id: string;
  type: string;
  data: Record<string, unknown>;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  max_attempts: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  oldest_job_age?: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    request_id: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    timestamp: string;
    request_id: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

// Zod schema validation helpers
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

export const safeValidateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);
  return result;
};
