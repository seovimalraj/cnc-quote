import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Industry-standard tolerance specifications for CNC machining
    const mockTolerances = [
      {
        id: 'iso-2768-f',
        name: 'ISO 2768-f (Fine) - ±0.05mm',
        description: 'Fine tolerance class per ISO 2768 standard - suitable for general precision parts',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'iso-2768-m',
        name: 'ISO 2768-m (Medium) - ±0.1mm', 
        description: 'Medium tolerance class per ISO 2768 standard - standard manufacturing tolerance',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'iso-2768-c',
        name: 'ISO 2768-c (Coarse) - ±0.2mm',
        description: 'Coarse tolerance class per ISO 2768 standard - economical for non-critical dimensions',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'precision-001',
        name: 'Precision - ±0.01mm',
        description: 'High precision tolerance for critical applications - requires advanced machining',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'precision-005',
        name: 'Precision - ±0.005mm',
        description: 'Ultra-high precision tolerance for aerospace/medical applications',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'ansi-b4.1',
        name: 'ANSI B4.1 Standard',
        description: 'American standard for preferred metric limits and fits',
        published: true,
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json(mockTolerances);

  } catch (error) {
    console.error('DFM tolerances fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tolerance options' },
      { status: 500 }
    );
  }
}
