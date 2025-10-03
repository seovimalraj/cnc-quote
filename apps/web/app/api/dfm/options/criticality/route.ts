import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Industry-standard part criticality classifications
    const mockCriticality = [
      {
        id: 'class-a-critical',
        name: 'Class A - Critical',
        description: 'Safety-critical parts where failure could result in injury, death, or mission failure. Requires 100% inspection, full traceability, and special handling per AS9102/PPAP Level 5.',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'class-b-major',
        name: 'Class B - Major',
        description: 'Function-critical parts where failure significantly affects system performance or availability. Requires enhanced quality controls and statistical process control.',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'class-c-minor',
        name: 'Class C - Minor',
        description: 'Non-critical parts where failure has minimal impact on system function. Standard quality procedures and sampling inspection acceptable.',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'flight-critical',
        name: 'Flight Critical (Aerospace)',
        description: 'Aerospace parts critical to flight safety per AS9100. Requires complete documentation, special process controls, and Certificate of Conformance.',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'life-sustaining',
        name: 'Life-Sustaining (Medical)',
        description: 'Medical device components critical to patient safety per ISO 13485. Requires design controls, risk management, and regulatory compliance.',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'safety-related',
        name: 'Safety-Related (Automotive)',
        description: 'Automotive safety components per ISO 26262 functional safety standard. Requires FMEA, special characteristics, and enhanced testing.',
        published: true,
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json(mockCriticality);

  } catch (error) {
    console.error('DFM criticality fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch criticality options' },
      { status: 500 }
    );
  }
}
