import { NextRequest, NextResponse } from 'next/server';

// Mock pricing configuration - in production this would come from a database
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
    }
  },
  risk_matrix: {
    'thin_wall': { time_multiplier: 1.2, risk_percent: 5 },
    'undercut': { time_multiplier: 1.5, risk_flat: 50 }
  },
  overhead_margin: {
    overhead_percent: 25,
    target_margin_percent: 35
  }
};

export async function GET() {
  try {
    // In production, fetch from database
    return NextResponse.json(mockPricingConfig);
  } catch (error) {
    console.error('Failed to fetch pricing config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const config = await request.json();

    // Basic validation
    if (!config.version || !config.machines || !config.materials) {
      return NextResponse.json(
        { error: 'Invalid configuration structure' },
        { status: 400 }
      );
    }

    // In production, save to database
    console.log('Saving pricing config draft:', config);

    return NextResponse.json({
      success: true,
      message: 'Configuration saved as draft'
    });
  } catch (error) {
    console.error('Failed to save pricing config:', error);
    return NextResponse.json(
      { error: 'Failed to save pricing configuration' },
      { status: 500 }
    );
  }
}
