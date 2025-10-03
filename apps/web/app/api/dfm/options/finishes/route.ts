import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Comprehensive surface finish options for CNC machining
    const mockFinishes = [
      {
        id: 'as-machined',
        name: 'As-Machined (Ra 3.2μm)',
        description: 'Standard machined surface finish, no additional processing - Ra 3.2μm (125 μin)',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'as-machined-fine',
        name: 'As-Machined Fine (Ra 1.6μm)',
        description: 'Fine machined surface finish with careful tool selection - Ra 1.6μm (63 μin)',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'bead-blasted',
        name: 'Bead Blasted',
        description: 'Glass bead blasted for uniform matte finish and stress relief',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'anodized-type2',
        name: 'Anodized Type II (Clear)',
        description: 'Clear anodizing for corrosion protection and wear resistance (aluminum only)',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'anodized-type2-color',
        name: 'Anodized Type II (Colored)',
        description: 'Colored anodizing - black, red, blue, gold available (aluminum only)',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'anodized-type3',
        name: 'Anodized Type III (Hard Coat)',
        description: 'Hard coat anodizing for maximum wear resistance (aluminum only)',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'powder-coating',
        name: 'Powder Coating',
        description: 'Durable powder coating finish - various colors available',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'zinc-plating',
        name: 'Zinc Plating (Clear)',
        description: 'Clear zinc plating for corrosion resistance (steel/iron)',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'zinc-plating-yellow',
        name: 'Zinc Plating (Yellow Chromate)',
        description: 'Yellow chromate zinc plating for enhanced corrosion resistance',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'nickel-plating',
        name: 'Nickel Plating',
        description: 'Electroless nickel plating for wear and corrosion resistance',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'chrome-plating',
        name: 'Chrome Plating',
        description: 'Hard chrome plating for maximum hardness and wear resistance',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'black-oxide',
        name: 'Black Oxide',
        description: 'Black oxide coating for mild corrosion resistance and appearance (steel)',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'passivation',
        name: 'Passivation',
        description: 'Chemical passivation for enhanced corrosion resistance (stainless steel)',
        published: true,
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json(mockFinishes);

  } catch (error) {
    console.error('DFM finishes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finish options' },
      { status: 500 }
    );
  }
}
