import { NextResponse } from 'next/server'

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

// Mock data for export
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
]

export async function GET() {
  try {
    // Create CSV content
    const headers = [
      'Quote ID',
      'Organization',
      'Buyer Name',
      'Buyer Email',
      'Last Activity',
      'Stage',
      'Subtotal',
      'Files Count',
      'DFM Blockers',
      'Promo Tried',
      'Assignee',
      'Created At'
    ]

    const csvRows = [
      headers.join(','),
      ...mockAbandonedQuotes.map(quote => [
        quote.id,
        quote.organization_id,
        `"${quote.buyer_name}"`,
        quote.buyer_email,
        quote.last_activity,
        quote.stage,
        quote.subtotal.toFixed(2),
        quote.files_count.toString(),
        quote.dfm_blockers_count.toString(),
        quote.promo_tried ? 'Yes' : 'No',
        quote.assignee_id || 'Unassigned',
        quote.created_at
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')

    // Return CSV response
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="abandoned-quotes.csv"',
      },
    })
  } catch (error) {
    console.error('Error exporting abandoned quotes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
