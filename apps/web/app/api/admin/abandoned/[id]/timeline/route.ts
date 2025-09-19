import { NextRequest, NextResponse } from 'next/server'

interface ActivityEvent {
  id: string
  quote_id: string
  user_id: string
  actor_role: 'buyer' | 'org_admin' | 'guest'
  name: string
  ts: string
  props: Record<string, any>
}

// Mock timeline data
const mockTimeline: ActivityEvent[] = [
  {
    id: 'event-1',
    quote_id: 'Q-2024-001',
    user_id: 'user-123',
    actor_role: 'buyer',
    name: 'page_view_instant_quote',
    ts: '2024-01-15T10:00:00Z',
    props: { page: '/quotes/Q-2024-001/instant' }
  },
  {
    id: 'event-2',
    quote_id: 'Q-2024-001',
    user_id: 'user-123',
    actor_role: 'buyer',
    name: 'file_uploaded',
    ts: '2024-01-15T10:05:00Z',
    props: { file_name: 'bracket.stl', file_size: 1024000 }
  },
  {
    id: 'event-3',
    quote_id: 'Q-2024-001',
    user_id: 'system',
    actor_role: 'guest',
    name: 'cad_analyze_started',
    ts: '2024-01-15T10:05:30Z',
    props: { p95_price_ms: 850 }
  },
  {
    id: 'event-4',
    quote_id: 'Q-2024-001',
    user_id: 'system',
    actor_role: 'guest',
    name: 'cad_analyze_succeeded',
    ts: '2024-01-15T10:06:15Z',
    props: { dfm_blockers_count: 2 }
  },
  {
    id: 'event-5',
    quote_id: 'Q-2024-001',
    user_id: 'user-123',
    actor_role: 'buyer',
    name: 'price_requested',
    ts: '2024-01-15T10:10:00Z',
    props: { material: 'Aluminum 6061', finish: 'Anodized' }
  },
  {
    id: 'event-6',
    quote_id: 'Q-2024-001',
    user_id: 'user-123',
    actor_role: 'buyer',
    name: 'lead_option_viewed',
    ts: '2024-01-15T10:15:00Z',
    props: { lead_option_id: 'usa-expedite' }
  },
  {
    id: 'event-7',
    quote_id: 'Q-2024-001',
    user_id: 'user-123',
    actor_role: 'buyer',
    name: 'lead_option_selected',
    ts: '2024-01-15T10:20:00Z',
    props: { lead_option_id: 'usa-expedite', subtotal: 125.50 }
  },
  {
    id: 'event-8',
    quote_id: 'Q-2024-001',
    user_id: 'user-123',
    actor_role: 'buyer',
    name: 'checkout_started',
    ts: '2024-01-15T10:25:00Z',
    props: { currency: 'USD', amount: 12550 }
  },
  {
    id: 'event-9',
    quote_id: 'Q-2024-001',
    user_id: 'user-123',
    actor_role: 'buyer',
    name: 'session_timeout',
    ts: '2024-01-15T14:30:00Z',
    props: { session_duration_min: 245 }
  }
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Filter timeline events for this quote
    const quoteTimeline = mockTimeline.filter(event => event.quote_id === params.id)

    // Sort by timestamp (most recent first)
    quoteTimeline.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

    return NextResponse.json({
      events: quoteTimeline,
      total: quoteTimeline.length,
    })
  } catch (error) {
    console.error('Error fetching timeline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
