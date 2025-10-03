// Shared catalog domain types to bridge toward Xometry-like configurability
// These are intentionally versioned-light; future: split by capability domain.

export interface MaterialCatalogItem {
  id: string;             // stable UUID
  code: string;           // human-friendly short code (e.g. ALU-6061-T6)
  name: string;           // marketing name
  category: 'metal' | 'plastic' | 'composite';
  subcategory?: string;   // e.g. 'aluminum', 'steel', 'abs'
  density_g_cm3?: number; // for weight based calc
  cost_per_kg: number;    // base raw cost
  machining_factor?: number; // multiplier for machining time removal
  molding_shrink_pct?: number; // injection shrink reference
  sheet_available_thickness_mm?: number[]; // for sheet metal validation
  min_wall_mm?: number;   // recommended minimal wall
  max_temp_c?: number;    // thermal constraints
  recyclable?: boolean;
  active: boolean;
}

export interface FinishCatalogItem {
  id: string;
  code: string; // e.g. ANODIZE-CLEAR
  name: string;
  type: 'surface' | 'coating' | 'treatment';
  process_family?: string; // anodize, powder, bead-blast
  cost_per_part?: number;  // fixed component
  cost_per_area_cm2?: number; // variable area
  prep_time_min?: number;  // setup
  rate_cm2_min?: number;   // processing rate
  typical_lead_time_days?: number;
  lead_time_add_days?: number; // additive to base lead time
  compatible_material_categories?: ('metal' | 'plastic' | 'composite')[];
  active: boolean;
}

export interface ProcessCatalogItem {
  id: string;
  code: string; // CNC-MILL-3AX, CNC-TURN, SHEET-LASER, INJ-MOLD
  name: string;
  family: 'cnc' | 'sheet_metal' | 'injection_molding' | 'finishing' | 'casting';
  axis_capability?: number; // for cnc
  max_part_envelope_mm?: [number, number, number];
  tolerance_classes?: string[]; // available tolerance codes
  base_lead_time_days: number;
  rush_lead_time_days?: number;
  complexity_weight?: number; // weighting factor when computing complexity score
  active: boolean;
}

export interface MachineCapabilityItem {
  id: string;
  code: string; // M-CNC-3AX-SMALL
  process_code: string; // links to ProcessCatalogItem.code
  description?: string;
  max_envelope_mm: [number, number, number];
  spindle_power_kw?: number;
  tool_count?: number;
  hourly_rate: number; // base machine hourly rate
  setup_time_min: number; // typical setup baseline
  min_order_value: number;
  min_order_qty: number;
  overhead_pct: number; // overhead allocation fraction (0-1)
  margin_pct: number;   // target margin fraction (0-1)
  active: boolean;
}

export interface CatalogCostFactors {
  material?: {
    scrap_rate_pct?: number;
    buy_unit?: 'kg' | 'sheet' | 'rod';
  };
  finishing?: {
    batch_min_charge?: number;
  };
}

export interface CatalogSnapshot {
  version: string;
  generated_at: string;
  materials: MaterialCatalogItem[];
  finishes: FinishCatalogItem[];
  processes: ProcessCatalogItem[];
  machines: MachineCapabilityItem[];
}

export interface MultiPartQuotePreviewRequest {
  currency?: string;
  parts: Array<{
    external_id?: string;
    process_code: string;
    material_code: string;
    finish_codes?: string[];
  quantity: number; // primary selected quantity (baseline)
  quantities?: number[]; // optional additional break quantities for matrix pricing
    // Optional lightweight DFM risk score (0-1). If provided, pricing may apply risk margin uplift.
    dfm_risk_score?: number;
    // geometry / manufacturing drivers (subset now, extend later)
    volume_cc?: number;
    surface_area_cm2?: number;
    removed_material_cc?: number;
    features?: {
      holes?: number;
      pockets?: number;
      slots?: number;
      faces?: number;
    };
    sheet?: {
      thickness_mm?: number;
      area_cm2?: number;
      cut_length_mm?: number;
      bends?: number;
      pierces?: number;
    };
    molding?: {
      part_volume_cc?: number;
      cycle_time_s?: number;
      cavity_count?: number;
    };
  }>;
}

export interface LeadTimePricingTier {
  code: string; // e.g. standard, expedited, LT3, LT5, LT7
  label: string; // human readable (e.g. 3 Days, 5 Days)
  days: number;
  price_multiplier: number; // applied to base unit price
}

export interface MultiPartQuotePreviewLineItem {
  part_external_id?: string;
  process_code: string;
  material_code: string;
  finish_codes?: string[];
  quantity: number;
  unit_price: number;
  total_price: number;
  price_tiers?: Array<LeadTimePricingTier & { unit_price: number; total_price: number }>;
  lead_time_days: number; // resolved (selected) lead time days
  lead_time_tier?: LeadTimePricingTier;
  complexity_score: number;
  features?: {
    detected_features: Array<{
      type: string;
      dimensions?: Record<string, number>;
      machining_difficulty: number;
      dff_issues?: string[];
    }>;
    summary: {
      total_features: number;
      complexity_score: number;
      dff_violations: string[];
    };
  };
  breakdown: {
    material_cost: number;
    machine_cost: number;
    finish_cost: number;
    setup_cost: number;
    qa_cost: number;
    margin: number;
    overhead: number;
  };
  quantity_matrix?: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    price_tiers?: Array<LeadTimePricingTier & { unit_price: number; total_price: number }>;
  }>;
  process_recommendation?: {
    recommended_process: {
      code: string;
      name: string;
      confidence: number;
      reasoning: string[];
      limitations: string[];
    };
    alternatives: Array<{
      code: string;
      name: string;
      confidence: number;
    }>;
    analysis: {
      primary_driver: string;
      cost_impact: string;
      lead_time_impact: string;
      quality_notes: string[];
    };
  };
  bom?: {
    items: Array<{
      id: string;
      category: string;
      name: string;
      description: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
      supplier?: string;
      lead_time_days?: number;
    }>;
    summary: {
      total_items: number;
      total_cost: number;
      categories: Record<string, { count: number; cost: number }>;
      critical_path_lead_time: number;
    };
  };
  notes?: string[];
}

export interface MultiPartQuotePreviewResponse {
  currency: string;
  total_parts: number;
  subtotal: number;
  lines: MultiPartQuotePreviewLineItem[];
  aggregate: {
    avg_lead_time_days: number;
    max_lead_time_days: number;
  };
  lead_time_tiers?: Array<LeadTimePricingTier>;
  price_tiers?: Array<LeadTimePricingTier & { subtotal: number }>;
  snapshot_version: string;
}
