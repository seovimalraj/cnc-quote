/** Pricing profile for a machine */
export interface PricingProfile {
  /** Unique profile ID */
  id: string;
  /** Associated machine ID */
  machine_id: string;
  /** Cost for setup per order */
  setup_cost: number;
  /** Machine hourly rate */
  machine_rate_per_hour: number;
  /** Minimum order quantity */
  min_order_qty: number;
  /** Minimum order value in currency */
  min_order_value: number;
  /** Minimum price per part */
  min_price_per_part: number;
  /** Profit margin percentage */
  margin: number;
  /** Overhead percentage */
  overhead: number;
  /** Rush order surcharge percentage */
  rush_surcharge: number;
  /** Standard lead time in days */
  standard_lead_time: number;
  /** Rush lead time in days */
  rush_lead_time: number;
  /** Material removal rate in cc/min */
  material_removal_rate_cc_min: number;
  /** Surface finish rate in cm2/min */
  surface_finish_rate_cm2_min: number;
  /** QA cost per part */
  qa_cost_per_part: number;
  /** Cutting speed in mm/min */
  cutting_speed_mm_min: number;
  /** Pierce time in seconds */
  pierce_time_s: number;
  /** Bend time in seconds */
  bend_time_s: number;
  /** Complexity multiplier */
  mold_complexity_multiplier: number;
  /** Cost per shot */
  shot_cost: number;
  /** Times for different features */
  feature_times: {
    hole: number;
    pocket: number;
    slot: number;
    face: number;
  };
  /** Quantity break discounts */
  quantity_breaks: {
    min_qty: number;
    discount: number;
  }[];
}

/** Cost breakdown components */
export interface PriceBreakdown {
  setup_cost: number;
  machine_cost: number;
  material_cost: number;
  finish_cost: number;
  qa_cost: number;
  margin: number;
  overhead: number;
}

/** Price response for quotes */
export interface PriceResponse {
  unit_price: number;
  total_price: number;
  min_order_qty: number;
  min_order_value: number;
  breakdown: PriceBreakdown;
  currency: string;
  lead_time_days: number;
  rush_surcharge?: number;
  status?: 'quoted' | 'tbd_pending';
}

/** Base price request interface */
export interface PriceRequest {
  machine_id: string;
  material_id: string;
  quantity: number;
  finish_ids?: string[];
  is_rush?: boolean;
}

/** CNC machining price request */
export interface CncPriceRequest extends PriceRequest {
  process_type: 'milling' | 'turning';
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
export interface SheetMetalPriceRequest extends PriceRequest {
  process_type: 'laser_cutting' | 'press_brake';
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
export interface InjectionMoldingPriceRequest extends PriceRequest {
  process_type: 'injection';
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

// Legacy type aliases for backward compatibility
export type CncPricingRequest = CncPriceRequest;
export type SheetMetalPricingRequest = SheetMetalPriceRequest;
export type InjectionMoldingPricingRequest = InjectionMoldingPriceRequest;

/** Pricing response interface */
export interface PricingResponse extends PriceResponse {}

/** Base pricing request */
export interface PricingRequest extends PriceRequest {}

/** Quote response interface */
export interface QuoteResponse {
  id: string;
  customer_id: string;
  quote_number: string;
  status: 'pending' | 'processing' | 'quoted' | 'approved' | 'rejected';
  total_price: number;
  unit_price: number;
  quantity: number;
  material_id: string;
  finish_ids: string[];
  lead_time_days: number;
  valid_until: string;
  created_at: string;
  updated_at: string;
  breakdown: PriceBreakdown;
}

/** Order details interface */
export interface OrderDetails {
  id: string;
  quote_id: string;
  customer_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  total_amount: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'failed';
  shipping_address: {
    name: string;
    company?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  created_at: string;
  updated_at: string;
}

/** Order response interface */
export interface OrderResponse extends OrderDetails {}
