import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const quoteId = params.quoteId;

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
