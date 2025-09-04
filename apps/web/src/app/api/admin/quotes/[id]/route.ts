import { NextRequest, NextResponse } from 'next/server'

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

interface LeadOption {
  id: string
  region: 'USA' | 'International'
  speed: 'Economy' | 'Standard' | 'Expedite'
  business_days: number
  unit_price: number
  msrp: number
  savings_text: string
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

interface ActivityEvent {
  id: string
  quote_id: string
  user_id: string
  actor_role: 'buyer' | 'org_admin' | 'guest'
  name: string
  ts: string
  props: Record<string, any>
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
        }
      ]
    }
  ]
}

const mockActivity: ActivityEvent[] = [
  {
    id: 'event-1',
    quote_id: 'Q-2024-001',
    user_id: 'admin-123',
    actor_role: 'org_admin',
    name: 'admin_quote_view',
    ts: '2024-01-15T11:00:00Z',
    props: { admin_id: 'admin-123' }
  },
  {
    id: 'event-2',
    quote_id: 'Q-2024-001',
    user_id: 'admin-123',
    actor_role: 'org_admin',
    name: 'admin_override_saved',
    ts: '2024-01-15T11:15:00Z',
    props: { field: 'machine_rate_per_hr', old_value: 75, new_value: 80 }
  }
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In a real implementation, this would fetch from your database
    // For now, return mock data
    const quote = mockQuote
    const activity = mockActivity

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      quote,
      activity,
    })
  } catch (error) {
    console.error('Error fetching admin quote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // In a real implementation, this would update the quote in your database
    // For now, just return the mock data with any updates
    const updatedQuote = {
      ...mockQuote,
      ...body,
      updated_at: new Date().toISOString()
    }

    return NextResponse.json(updatedQuote)
  } catch (error) {
    console.error('Error updating admin quote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
