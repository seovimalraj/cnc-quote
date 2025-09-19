import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    // Mock workspace data
    const mockData = {
      quote: {
        id: params.quoteId,
        org_name: 'Acme Corp',
        status: 'Needs_Review',
        value_estimate: 227.98
      },
      lines: [
        {
          id: 'line_001',
          part_name: 'Bracket Assembly',
          quantity: 50,
          process: 'CNC Milling',
          material: 'Aluminum 6061',
          finish: 'Anodized',
          dfm_status: 'blocker',
          unit_price: 4.56,
          total_price: 228.00
        }
      ],
      dfm_results: {
        summary: {
          passed: 15,
          total: 20,
          warnings: 3,
          blockers: 2
        },
        findings: [
          {
            id: 'finding_001',
            check_id: 'wall_thickness',
            severity: 'blocker',
            message: 'Wall thickness 0.8mm is below minimum 1.5mm for CNC milling',
            metrics: { actual: 0.8, minimum: 1.5 },
            face_ids: [12, 13],
            edge_ids: [],
            ack: false,
            note: null
          }
        ]
      },
      pricing: {
        subtotal: 228.00,
        taxes: 18.24,
        shipping: 15.00,
        total: 261.24
      }
    };

    return NextResponse.json(mockData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
  }
}

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
