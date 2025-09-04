import { NextRequest, NextResponse } from 'next/server'

interface AbandonedQuote {
  id: string
  organization_id: string
  buyer_name: string
  buyer_email: string
  last_activity: string
  stage: 'Before Upload' | 'After Upload' | 'After CAD' | 'After First Price' | 'After Lead Select' | 'Checkout Abandon'
  subtotal: number
  files_count: number
  dfm_blockers_count: number
  promo_tried: boolean
  assignee_id: string | null
  created_at: string
}

// Mock data for development
const mockAbandonedQuotes: AbandonedQuote[] = [
  {
    id: 'Q-2024-001',
    organization_id: 'org-123',
    buyer_name: 'John Doe',
    buyer_email: 'john@example.com',
    last_activity: '2024-01-15T14:30:00Z',
    stage: 'After Lead Select',
    subtotal: 125.50,
    files_count: 1,
    dfm_blockers_count: 2,
    promo_tried: false,
    assignee_id: null,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'Q-2024-002',
    organization_id: 'org-456',
    buyer_name: 'Jane Smith',
    buyer_email: 'jane@example.com',
    last_activity: '2024-01-14T16:45:00Z',
    stage: 'Checkout Abandon',
    subtotal: 89.99,
    files_count: 1,
    dfm_blockers_count: 0,
    promo_tried: true,
    assignee_id: 'user-123',
    created_at: '2024-01-14T09:15:00Z',
  },
  {
    id: 'Q-2024-003',
    organization_id: 'org-789',
    buyer_name: 'Bob Johnson',
    buyer_email: 'bob@example.com',
    last_activity: '2024-01-13T11:20:00Z',
    stage: 'After CAD',
    subtotal: 234.75,
    files_count: 2,
    dfm_blockers_count: 1,
    promo_tried: false,
    assignee_id: null,
    created_at: '2024-01-13T08:30:00Z',
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const age = searchParams.get('age')
    const value_band = searchParams.get('value_band')
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')

    let filteredQuotes = [...mockAbandonedQuotes]

    // Apply filters
    if (age) {
      const now = new Date()
      const ageMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }[age]

      if (ageMs) {
        filteredQuotes = filteredQuotes.filter(quote =>
          now.getTime() - new Date(quote.last_activity).getTime() <= ageMs
        )
      }
    }

    if (value_band) {
      filteredQuotes = filteredQuotes.filter(quote => {
        switch (value_band) {
          case '<$100': return quote.subtotal < 100
          case '$100–$1k': return quote.subtotal >= 100 && quote.subtotal < 1000
          case '$1k–$10k': return quote.subtotal >= 1000 && quote.subtotal < 10000
          case '>$10k': return quote.subtotal >= 10000
          default: return true
        }
      })
    }

    if (stage) {
      filteredQuotes = filteredQuotes.filter(quote => quote.stage === stage)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredQuotes = filteredQuotes.filter(quote =>
        quote.buyer_name.toLowerCase().includes(searchLower) ||
        quote.buyer_email.toLowerCase().includes(searchLower) ||
        quote.id.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({
      quotes: filteredQuotes,
      total: filteredQuotes.length,
    })
  } catch (error) {
    console.error('Error fetching abandoned quotes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
