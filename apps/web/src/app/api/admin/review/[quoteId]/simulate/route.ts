import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const body = await request.json();

    // Mock price simulation
    const mockResult = {
      original: {
        unit_price: 4.56,
        total_price: 228.00,
        breakdown: {
          setup: 25.00,
          machine_time: 85.60,
          material: 45.20,
          tooling: 12.50,
          finish: 8.75,
          inspection: 5.00,
          risk: 3.50,
          overhead: 22.40,
          margin: 20.00
        }
      },
      simulated: {
        unit_price: 5.12,
        total_price: 256.00,
        breakdown: {
          setup: 30.00,
          machine_time: 95.80,
          material: 50.40,
          tooling: 15.00,
          finish: 10.00,
          inspection: 6.00,
          risk: 4.00,
          overhead: 25.60,
          margin: 19.20
        }
      },
      diff: {
        unit_price: 0.56,
        total_price: 28.00,
        breakdown: {
          setup: 5.00,
          machine_time: 10.20,
          material: 5.20,
          tooling: 2.50,
          finish: 1.25,
          inspection: 1.00,
          risk: 0.50,
          overhead: 3.20,
          margin: -0.80
        }
      }
    };

    return NextResponse.json(mockResult);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to simulate price' }, { status: 500 });
  }
}
