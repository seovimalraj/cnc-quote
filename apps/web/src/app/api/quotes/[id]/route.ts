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
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;

    // In a real implementation, this would fetch from your database
    // For now, we'll return mock data that simulates progress
    const mockQuote = {
      id: quoteId,
      status: 'draft',
      estimatedPrice: Math.floor(Math.random() * 500) + 100,
      estimatedTime: `${Math.floor(Math.random() * 14) + 1} days`,
      lines: [
        {
          id: 'line-1',
          status: 'completed',
          fileName: 'part1.step',
          analysis: {
            volume: 125.5,
            surfaceArea: 890.2,
            boundingBox: { x: 50, y: 30, z: 20 }
          },
          pricing: {
            basePrice: 150,
            materialCost: 25,
            laborCost: 75,
            totalPrice: 250
          }
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
