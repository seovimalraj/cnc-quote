import { NextRequest, NextResponse } from 'next/server';

// Simulate processing time
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock pricing calculation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.quantity || !body.material_code || !body.process) {
      return NextResponse.json(
        { error: 'Missing required fields: quantity, material_code, process' },
        { status: 400 }
      );
    }

    // Simulate network delay (200-500ms)
    await delay(Math.random() * 300 + 200);

    // Calculate mock price
    const basePrice = 100;
    
    // Quantity scaling with economies of scale
    const qtyFactor = Math.pow(body.quantity, 0.75);
    
    // Material multipliers
    const materialMultipliers: Record<string, number> = {
      AL6061: 1.0,
      SS304: 1.15,
      SS316: 1.20,
      BRASS: 1.10,
      COPPER: 1.25,
      TITANIUM: 2.50,
      ABS: 0.85,
      PLA: 0.80,
      NYLON: 0.95,
    };
    const materialFactor = materialMultipliers[body.material_code] || 1.08;
    
    // Process multipliers
    const processMultipliers: Record<string, number> = {
      cnc_milling: 1.0,
      turning: 0.90,
      sheet: 0.85,
      im: 0.70,
    };
    const processFactor = processMultipliers[body.process] || 1.0;
    
    // Lead class multipliers
    const leadMultipliers: Record<string, number> = {
      econ: 0.96,
      std: 1.0,
      express: 1.12,
    };
    const leadFactor = leadMultipliers[body.lead_class] || 1.0;
    
    // Calculate subtotal
    const subtotal = basePrice * qtyFactor * materialFactor * processFactor * leadFactor;
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    
    // Lead days by class
    const leadDays: Record<string, number> = {
      econ: 10,
      std: 7,
      express: 3,
    };

    // Mock response
    const response = {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      lead_days: leadDays[body.lead_class] || 7,
      breakdown: [
        { factor: 'Base Price', amount: basePrice },
        { factor: 'Quantity Factor', amount: Math.round(qtyFactor * 100) / 100 },
        { factor: 'Material', amount: materialFactor },
        { factor: 'Process', amount: processFactor },
        { factor: 'Lead Time', amount: leadFactor },
      ],
      pricing_hash: Math.random().toString(36).substring(7),
      version: body.catalog_version || 'v1',
      from_cache: false,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Pricing error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
