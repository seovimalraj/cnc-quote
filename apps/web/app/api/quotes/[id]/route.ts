import { NextRequest, NextResponse } from 'next/server'

interface LeadOption {
  id: string
  region: 'USA' | 'International'
  speed: 'Economy' | 'Standard' | 'Expedite'
  business_days: number
  unit_price: number
  msrp: number
  savings_text: string
}

interface PricingBreakdown {
  setup_time_min: number
  cycle_time_min: number
  machine_rate_per_hr: number
  material_buy_cost: number
  material_waste_factor: number
  tooling_wear_cost: number
  finish_cost: number
  inspection_cost: number
  risk_adder: number
  overhead: number
  margin: number
  unit_price: number
}

interface QuoteLine {
  id: string
  file_id: string
  file_name: string
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding'
  material: string
  finish: string | null
  qty: number
  pricing_breakdown: PricingBreakdown
  lead_time_options: LeadOption[]
  features?: {
    detected_features: Array<{
      type: string
      dimensions?: Record<string, number>
      machining_difficulty: number
      dff_issues?: string[]
    }>
    summary: {
      total_features: number
      complexity_score: number
      dff_violations: string[]
    }
  }
  process_recommendation?: {
    recommended_process: {
      code: string
      name: string
      confidence: number
      reasoning: string[]
      limitations: string[]
    }
    alternatives: Array<{
      code: string
      name: string
      confidence: number
    }>
    analysis: {
      primary_driver: string
      cost_impact: string
      lead_time_impact: string
      quality_notes: string[]
    }
  }
}

interface Quote {
  id: string
  organization_id: string
  status: 'Draft' | 'Analyzing' | 'Priced' | 'Needs_Review' | 'Reviewed' | 'Sent' | 'Accepted' | 'Expired' | 'Abandoned'
  source: 'web' | 'widget' | 'large_order'
  lines: QuoteLine[]
  selected_lead_option_id: string | null
  currency: string
  subtotal: number
  promo_code: string | null
  created_at: string
  updated_at: string
}

// Mock data for development
const mockQuote: Quote = {
  id: 'Q-2024-001',
  organization_id: 'org-123',
  status: 'Priced',
  source: 'web',
  selected_lead_option_id: null,
  currency: 'USD',
  subtotal: 125.50,
  promo_code: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  lines: [
    {
      id: 'line-1',
      file_id: 'file-123',
      file_name: 'bracket.stl',
      process: 'CNC',
      material: 'Aluminum 6061',
      finish: 'Anodized',
      qty: 10,
      pricing_breakdown: {
        setup_time_min: 30,
        cycle_time_min: 15,
        machine_rate_per_hr: 75,
        material_buy_cost: 25.50,
        material_waste_factor: 1.1,
        tooling_wear_cost: 5.00,
        finish_cost: 8.50,
        inspection_cost: 3.00,
        risk_adder: 2.50,
        overhead: 15.00,
        margin: 25.00,
        unit_price: 12.55
      },
      features: {
        detected_features: [
          {
            type: 'hole',
            dimensions: { diameter: 8.5, depth: 15.2 },
            machining_difficulty: 4,
            dff_issues: []
          },
          {
            type: 'pocket',
            dimensions: { width: 25.0, length: 30.0, depth: 5.0 },
            machining_difficulty: 3,
            dff_issues: []
          }
        ],
        summary: {
          total_features: 2,
          complexity_score: 3.2,
          dff_violations: []
        }
      },
      process_recommendation: {
        recommended_process: {
          code: 'CNC-MILL-3AX',
          name: '3-Axis CNC Milling',
          confidence: 0.85,
          reasoning: [
            'Complex 3D geometry with multiple features',
            'Good balance of capability and cost',
            'Suitable for aluminum material'
          ],
          limitations: [
            'May require multiple setups for complex features',
            'Limited to 3-axis movement'
          ]
        },
        alternatives: [
          {
            code: 'CNC-MILL-5AX',
            name: '5-Axis CNC Milling',
            confidence: 0.75
          },
          {
            code: 'SLA-3D',
            name: 'SLA 3D Printing',
            confidence: 0.6
          }
        ],
        analysis: {
          primary_driver: 'Complex geometry with holes and pockets',
          cost_impact: 'Comparable cost to CNC milling',
          lead_time_impact: 'Standard lead time (3-7 days)',
          quality_notes: [
            'Excellent dimensional accuracy and surface finish',
            'Good for tight tolerances with proper fixturing'
          ]
        }
      },
      lead_time_options: [
        {
          id: 'usa-expedite',
          region: 'USA',
          speed: 'Expedite',
          business_days: 3,
          unit_price: 15.00,
          msrp: 18.00,
          savings_text: 'Save $3.00'
        },
        {
          id: 'usa-standard',
          region: 'USA',
          speed: 'Standard',
          business_days: 7,
          unit_price: 12.55,
          msrp: 15.00,
          savings_text: 'Save $2.45'
        },
        {
          id: 'usa-economy',
          region: 'USA',
          speed: 'Economy',
          business_days: 14,
          unit_price: 10.50,
          msrp: 12.00,
          savings_text: 'Save $1.50'
        },
        {
          id: 'intl-economy',
          region: 'International',
          speed: 'Economy',
          business_days: 21,
          unit_price: 8.50,
          msrp: 10.00,
          savings_text: 'Save $1.50'
        }
      ]
    }
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;

    // Generate realistic pricing based on quote ID
    const seed = quoteId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = Math.floor((seed % 300) + 50); // $50-$350 base price
    const quantity = Math.floor((seed % 50) + 1); // 1-50 quantity

    // Calculate bulk discount multiplier (like Xometry)
    let bulkMultiplier = 1.0;
    if (quantity >= 100) bulkMultiplier = 0.7;      // 30% discount for 100+
    else if (quantity >= 50) bulkMultiplier = 0.8;  // 20% discount for 50-99
    else if (quantity >= 25) bulkMultiplier = 0.9;  // 10% discount for 25-49
    else if (quantity >= 10) bulkMultiplier = 0.95; // 5% discount for 10-24

    const unitPrice = basePrice * bulkMultiplier;

    // Mock file names based on seed
    const fileNames = ['bracket.step', 'housing.stl', 'mount.iges', 'plate.dxf', 'cover.x_t'];
    const fileName = fileNames[seed % fileNames.length];

    // Calculate lead times with 7-day minimum
    const baseLeadTime = Math.max(7, Math.floor((seed % 10) + 7)); // 7-16 days base

    // In a real implementation, this would fetch from your database
    // For now, we'll return realistic pricing data
    const mockQuote = {
      id: quoteId,
      status: 'Priced',
      subtotal: unitPrice * quantity,
      currency: 'USD',
      lines: [
        {
          id: 'line-1',
          fileId: `file-${quoteId}`,
          fileName: fileName,
          process: 'CNC',
          material: 'Aluminum 6061',
          finish: 'Anodized',
          qty: quantity,
          status: 'Priced',
          pricingBreakdown: {
            setup_time_min: 30,
            cycle_time_min: 15,
            machine_rate_per_hr: 75,
            material_buy_cost: unitPrice * 0.4,
            material_waste_factor: 1.1,
            tooling_wear_cost: unitPrice * 0.05,
            finish_cost: unitPrice * 0.1,
            inspection_cost: unitPrice * 0.1,
            risk_adder: unitPrice * 0.05,
            overhead: unitPrice * 0.2,
            margin: unitPrice * 0.15,
            unit_price: unitPrice
          },
          leadTimeOptions: [
            {
              id: 'usa-expedite',
              region: 'USA',
              speed: 'Expedite',
              business_days: Math.max(3, Math.floor(baseLeadTime * 0.3)),
              unit_price: unitPrice * 2.0,
              msrp: unitPrice * 2.3,
              savings_text: `Save $${(unitPrice * 0.3).toFixed(2)}`
            },
            {
              id: 'usa-standard',
              region: 'USA',
              speed: 'Standard',
              business_days: Math.max(7, Math.floor(baseLeadTime * 0.6)),
              unit_price: unitPrice * 1.3,
              msrp: unitPrice * 1.6,
              savings_text: `Save $${(unitPrice * 0.3).toFixed(2)}`
            },
            {
              id: 'usa-economy',
              region: 'USA',
              speed: 'Economy',
              business_days: Math.max(7, baseLeadTime),
              unit_price: unitPrice,
              msrp: unitPrice * 1.2,
              savings_text: `Save $${(unitPrice * 0.2).toFixed(2)}`
            }
          ]
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(mockQuote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}
