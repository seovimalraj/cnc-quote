import { FeatureTimes, QuantityBreak } from "./common";

export interface PricingProfile {
  id: string;
  machine_id: string;
  setup_cost: number;
  machine_rate_per_hour: number;
  min_order_qty: number;
  min_order_value: number;
  min_price_per_part: number;
  margin: number;
  overhead: number;
  rush_surcharge: number;
  standard_lead_time: number;
  rush_lead_time: number;
  material_removal_rate_cc_min: number;
  surface_finish_rate_cm2_min: number;
  feature_times: FeatureTimes;
  qa_cost_per_part: number;
  max_tonnage: number;
  cutting_speed_mm_min: number;
  pierce_time_s: number;
  bend_time_s: number;
  quantity_breaks: QuantityBreak[];
}

export interface PriceBreakdown {
  setup_cost: number;
  machine_cost: number;
  material_cost: number;
  qa_cost: number;
  margin: number;
  overhead: number;
  finish_cost: number;
}

export interface PriceResponse {
  unit_price: number;
  total_price: number;
  min_order_qty: number;
  min_order_value: number;
  breakdown: PriceBreakdown;
  currency: string;
  lead_time_days: number;
  rush_surcharge?: number;
  status?: "tbd_pending";
}

export interface BasePriceRequest {
  process_type: string;
  machine_id: string;
  material_id: string;
  quantity: number;
  finish_ids?: string[];
  is_rush?: boolean;
}

export interface CncPriceRequest extends BasePriceRequest {
  volume_cc: number;
  surface_area_cm2: number;
  removed_material_cc: number;
  features: {
    holes: number;
    pockets: number;
    slots: number;
    faces: number;
  };
  complexity_multiplier: number;
}

export interface SheetMetalPriceRequest extends BasePriceRequest {
  thickness_mm: number;
  cut_length_mm: number;
  pierces: number;
  bends: number;
  nest_utilization: number;
}

export interface InjectionMoldingPriceRequest extends BasePriceRequest {
  part_volume_cc: number;
  shot_weight_g: number;
  cycle_time_s: number;
  cavity_count: number;
  tonnage_required: number;
  cooling_time_s: number;
}

export interface Machine {
  id: string;
  name: string;
  type: "cnc" | "sheet_metal" | "injection_molding";
  capabilities: string[];
  max_dimensions: {
    x: number;
    y: number;
    z: number;
  };
}

export interface Material {
  id: string;
  name: string;
  type: string;
  density: number;
  price_per_kg: number;
  properties: Record<string, unknown>;
}

export interface Finish {
  id: string;
  name: string;
  type: string;
  cost_per_unit: number;
  unit: string;
  min_order_qty: number;
}

export interface Tolerance {
  id: string;
  name: string;
  standard: string;
  accuracy: string;
  cost_multiplier: number;
}
