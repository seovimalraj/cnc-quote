import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source = 'web', guestEmail } = body;

    // Generate quote ID
    const quoteId = `Q${Date.now().toString().slice(-6)}`;

    // Generate mock pricing data
    const basePrice = Math.floor(Math.random() * 500) + 100; // $100-$600
    const estimatedPrice = basePrice + Math.floor(Math.random() * 100); // Add some variation

    // Mock lead time options
    const leadTimes = [
      { id: 'expedite', name: 'Expedite', days: 3, price: estimatedPrice * 1.5 },
      { id: 'standard', name: 'Standard', days: 7, price: estimatedPrice * 1.2 },
      { id: 'economy', name: 'Economy', days: 14, price: estimatedPrice }
    ];

    // In a real implementation, this would create a draft quote in the database
    // For now, we'll return a mock quote object with pricing
    const quote = {
      id: quoteId,
      status: 'draft',
      source,
      guestEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: 'prospects', // For guest users
      totalValue: estimatedPrice,
      estimatedPrice,
      estimatedTime: '7-10 business days',
      currency: 'USD',
      lines: [],
      leadTimeOptions: leadTimes
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
