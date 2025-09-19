import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { lead_option_id } = body

    if (!lead_option_id) {
      return NextResponse.json(
        { error: 'lead_option_id is required' },
        { status: 400 }
      )
    }

    // In a real implementation, this would:
    // 1. Validate the lead_option_id exists for this quote
    // 2. Update the quote's selected_lead_option_id
    // 3. Recalculate the subtotal based on the selected option
    // 4. Update the quote in the database

    // For now, return a mock response
    const mockUpdatedQuote = {
      id: params.id,
      selected_lead_option_id: lead_option_id,
      subtotal: 125.50, // This would be recalculated based on the selected option
      updated_at: new Date().toISOString(),
      // ... other quote fields
    }

    return NextResponse.json(mockUpdatedQuote)
  } catch (error) {
    console.error('Error updating lead option:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
