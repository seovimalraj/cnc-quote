/** Base price request interface */
export interface PricingRequest {
  process_type: string;
  machine_id: string;
  material_id: string;
  quantity: number;
  finish_ids?: string[];
  is_rush?: boolean;
  org_id?: string;
}

/** CNC machining price request */
export interface CncPricingRequest extends PricingRequest {
  process_type: "milling" | "turning";
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

/** Sheet metal price request */
export interface SheetMetalPricingRequest extends PricingRequest {
  process_type: "laser_cutting" | "press_brake";
  thickness_mm: number;
  sheet_area_cm2: number;
  cut_length_mm: number;
  pierces: number;
  features: {
    bends: number;
    holes: number;
    slots: number;
    corners: number;
  };
  nest_utilization: number;
  complexity_multiplier: number;
}

/** Injection molding price request */
export interface InjectionMoldingPricingRequest extends PricingRequest {
  process_type: "injection";
  volume_cc: number;
  part_volume_cc: number;
  shot_weight_g: number;
  cycle_time_s: number;
  cavity_count: number;
  mold_complexity: number;
  tonnage_required: number;
  cooling_time_s: number;
  features: {
    undercuts: number;
    side_actions: number;
    textures: number;
  };
  complexity_multiplier: number;
}

/** Cost breakdown components */
export interface PricingBreakdown {
  setup_cost: number;
  machine_cost: number;
  material_cost: number;
  finish_cost: number;
  qa_cost: number;
  margin: number;
  overhead: number;
}

/** Price response */
export interface PricingResponse {
  unit_price: number;
  total_price: number;
  min_order_qty: number;
  min_order_value: number;
  breakdown: PricingBreakdown;
  currency: string;
  lead_time_days: number;
  rush_surcharge?: number;
  status?: "quoted" | "tbd_pending";
}
