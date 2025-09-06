import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source = 'web', guestEmail } = body;

    // Generate quote ID
    const quoteId = `Q${Date.now().toString().slice(-6)}`;

    // In a real implementation, this would create a draft quote in the database
    // For now, we'll return a mock quote object
    const quote = {
      id: quoteId,
      status: 'draft',
      source,
      guestEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: 'prospects', // For guest users
      totalValue: 0,
      lineCount: 0
    };

    return NextResponse.json(quote);

  } catch (error) {
    console.error('Quote creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
