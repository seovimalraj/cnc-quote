import { NextRequest, NextResponse } from 'next/server';

// Mock pricing configuration (in production, this would come from database)
const mockPricingConfig = {
  version: 'v1.2.3',
  machines: {
    '3-axis-milling': {
      axes: 3,
      envelope: { x: 1200, y: 800, z: 600 },
      hourly_rate: 75,
      setup_rate: 85,
      min_setup_min: 30,
      feed_rate_map: { aluminum: 800, steel: 400, plastic: 1200 },
      rapid_rate: 2000,
      toolchange_s: 15,
      region: 'USA',
      capacity: 0.85
    }
  },
  materials: {
    'Aluminum 6061': {
      grade: '6061',
      density_kg_m3: 2700,
      buy_price: 2.50,
      stock_forms: ['plate', 'bar', 'extrusion'],
      waste_factor_percent: 15,
      finish_compat: ['anodize', 'powder_coat', 'polish'],
      min_wall_mm: 1.5,
      min_hole_mm: 3.0,
      machinability: 0.8
    },
    'Steel 1018': {
      grade: '1018',
      density_kg_m3: 7850,
      buy_price: 1.20,
      stock_forms: ['plate', 'bar', 'round'],
      waste_factor_percent: 20,
      finish_compat: ['powder_coat', 'paint', 'plate'],
      min_wall_mm: 2.0,
      min_hole_mm: 4.0,
      machinability: 0.6
    }
  },
  finishes: {
    'Anodized Clear': {
      model: 'per_area',
      rate: 0.15,
      min_lot: 10,
      capacity_dims: { max_area: 10000 },
      leadtime_add: 2,
      region_allowed: ['USA', 'International']
    },
    'Powder Coat Black': {
      model: 'per_part',
      rate: 12.00,
      min_lot: 25,
      capacity_dims: { max_area: 5000 },
      leadtime_add: 3,
      region_allowed: ['USA']
    }
  },
  tolerance_packs: {
    'Std': { cycle_time_multiplier: 1.0, surface_default: 125, inspection_requirements: 'basic' },
    'Tight': { cycle_time_multiplier: 1.3, surface_default: 63, inspection_requirements: 'formal' },
    'Critical': { cycle_time_multiplier: 1.8, surface_default: 32, inspection_requirements: 'cmm' }
  },
  inspection: {
    base_usd: 25,
    per_dim_usd: 5,
    program_min: 30
  },
  speed_region: {
    'USA': {
      'Economy': { multiplier: 0.7, leadtime_days: 7 },
      'Standard': { multiplier: 1.0, leadtime_days: 4 },
      'Expedite': { multiplier: 1.4, leadtime_days: 3 }
    },
    'International': {
      'Economy': { multiplier: 0.6, leadtime_days: 14 },
      'Standard': { multiplier: 0.9, leadtime_days: 10 },
      'Expedite': { multiplier: 1.3, leadtime_days: 5 }
    }
  },
  risk_matrix: {
    'thin_wall': { time_multiplier: 1.2, risk_percent: 5 },
    'undercut': { time_multiplier: 1.5, risk_flat: 50 },
    'complex_geometry': { time_multiplier: 1.3, risk_percent: 8 }
  },
  overhead_margin: {
    overhead_percent: 25,
    target_margin_percent: 35
  }
};

// Pricing engine functions
function calculateMaterialCost(volume_cm3: number, material: string, qty: number): number {
  const mat = mockPricingConfig.materials[material];
  if (!mat) return 0;

  const stock_allowance = 1.1; // 10% stock allowance
  const v_stock = volume_cm3 * stock_allowance;
  const mass = v_stock * mat.density_kg_m3 / 1000000; // Convert cm³ to m³
  const buy = mass * mat.buy_price;
  const cost = buy * (1 + mat.waste_factor_percent / 100);
  return cost / qty; // Per unit
}

function calculateSetupCost(flips: number, fixtures: number, qty: number): number {
  const machine = mockPricingConfig.machines['3-axis-milling'];
  const t_setup = machine.min_setup_min + (flips * 15) + (fixtures * 10); // Base + per flip + per fixture
  return (t_setup / 60 * machine.setup_rate) / qty;
}

function calculateCycleCost(volume_removed: number, surface_area: number, features: number, material: string, tolerance_pack: string): number {
  const machine = mockPricingConfig.machines['3-axis-milling'];
  const feed_rate = machine.feed_rate_map[material.toLowerCase()] || 600;
  const tolerance_mult = mockPricingConfig.tolerance_packs[tolerance_pack]?.cycle_time_multiplier || 1.0;

  // Simplified cycle time calculation
  const k_vol = 0.001; // Time per cm³ removed
  const k_area = 0.01; // Time per cm²
  const k_feat = 2; // Time per feature

  const t_cycle = (k_vol * volume_removed) + (k_area * surface_area) + (k_feat * features) + 30; // + rapid time
  return (t_cycle / 60) * machine.hourly_rate * tolerance_mult;
}

function calculateToolingCost(volume_removed: number, threads: number, material: string): number {
  const hardness = material.includes('Steel') ? 1.5 : 1.0;
  const c_wear = 0.0001; // Wear cost per cm³
  const tap_cost = 5; // Cost per tap

  return (c_wear * volume_removed * hardness) + (threads * tap_cost);
}

function calculateFinishCost(area_m2: number, finish: string, qty: number): number {
  const fin = mockPricingConfig.finishes[finish];
  if (!fin) return 0;

  if (fin.model === 'per_area') {
    const per_unit = Math.max(fin.min_lot / qty, area_m2 * fin.rate);
    return per_unit;
  }
  return fin.rate; // Per part
}

function calculateInspectionCost(critical_dims: number, inspection: string): number {
  const insp = mockPricingConfig.inspection;
  const level_multiplier = inspection === 'CMM' ? 2 : inspection === 'Formal' ? 1.5 : 1;

  return (insp.base_usd + (critical_dims * insp.per_dim_usd)) * level_multiplier;
}

function calculateRiskCost(direct_cost: number, dfm_codes: string[]): number {
  let risk_cost = 0;
  dfm_codes.forEach(code => {
    const risk = mockPricingConfig.risk_matrix[code];
    if (risk) {
      if (risk.risk_percent) {
        risk_cost += direct_cost * (risk.risk_percent / 100);
      }
      if (risk.risk_flat) {
        risk_cost += risk.risk_flat;
      }
    }
  });
  return risk_cost;
}

function applyOverheadAndMargin(direct_cost: number): number {
  const { overhead_percent, target_margin_percent } = mockPricingConfig.overhead_margin;
  const with_overhead = direct_cost * (1 + overhead_percent / 100);
  return with_overhead * (1 + target_margin_percent / 100);
}

function applySpeedRegionMultiplier(base_price: number, speed: string, region: string): number {
  const speed_region = mockPricingConfig.speed_region[region]?.[speed];
  return speed_region ? base_price * speed_region.multiplier : base_price;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quote_id, line_id, specs, features } = body;

    // Extract features from CAD analysis
    const bbox = features?.bbox || { x: 100, y: 50, z: 25 };
    const volume_cm3 = features?.volume || (bbox.x * bbox.y * bbox.z / 1000); // Convert mm³ to cm³
    const surface_area = features?.area || (2 * (bbox.x * bbox.y + bbox.x * bbox.z + bbox.y * bbox.z) / 1000000); // Convert mm² to m²
    const volume_removed = volume_cm3 * 0.3; // Assume 30% material removal
    const holes = features?.holes || 5;
    const threads = specs?.threads || 2;
    const features_count = holes + threads + (features?.pockets || 0);

    // Calculate costs
    const material_cost = calculateMaterialCost(volume_cm3, specs.material, specs.quantity);
    const setup_cost = calculateSetupCost(2, 1, specs.quantity); // 2 flips, 1 fixture
    const cycle_cost = calculateCycleCost(volume_removed, surface_area, features_count, specs.material, specs.tolerancePack);
    const tooling_cost = calculateToolingCost(volume_removed, threads, specs.material);
    const finish_cost = calculateFinishCost(surface_area, specs.finish, specs.quantity);
    const inspection_cost = calculateInspectionCost(10, specs.inspection); // Assume 10 critical dims

    const direct_cost = material_cost + setup_cost + cycle_cost + tooling_cost + finish_cost + inspection_cost;
    const risk_cost = calculateRiskCost(direct_cost, features?.dfm_codes || []);
    const total_direct = direct_cost + risk_cost;
    const standard_price = applyOverheadAndMargin(total_direct);

    // Generate pricing by speed and region
    const pricing_breakdown = {
      material_cost,
      setup_cost,
      cycle_cost,
      tooling_cost,
      finish_cost,
      inspection_cost,
      risk_cost,
      direct_cost: total_direct,
      standard_price
    };

    const lead_time_options = [];
    ['USA', 'International'].forEach(region => {
      ['Economy', 'Standard', 'Expedite'].forEach(speed => {
        const unit_price = applySpeedRegionMultiplier(standard_price, speed, region);
        const speed_region = mockPricingConfig.speed_region[region]?.[speed];

        lead_time_options.push({
          id: `${region.toLowerCase()}-${speed.toLowerCase()}`,
          region: region as 'USA' | 'International',
          speed: speed as 'Economy' | 'Standard' | 'Expedite',
          business_days: speed_region?.leadtime_days || 7,
          unit_price: Math.round(unit_price * 100) / 100,
          msrp: Math.round(unit_price * 1.2 * 100) / 100,
          savings_text: 'Save 17%'
        });
      });
    });

    const result = {
      line_id,
      pricing_breakdown,
      lead_time_options,
      config_version: mockPricingConfig.version,
      calculated_at: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Pricing calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}
