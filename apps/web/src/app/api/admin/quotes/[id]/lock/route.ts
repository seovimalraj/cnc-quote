import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In a real implementation, this would:
    // 1. Lock the quote price to prevent auto-repricing
    // 2. Store a price snapshot
    // 3. Update the quote status if needed

    console.log(`Locking price for quote ${params.id}`)

    return NextResponse.json({
      success: true,
      message: 'Quote price locked successfully',
      quote_id: params.id,
      locked_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error locking quote price:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
