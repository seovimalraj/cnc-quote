import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_MATERIALS = [
  {
    id: '6061-T6',
    code: '6061-T6',
    name: 'Aluminum 6061-T6',
    description: 'Excellent machinability and strength-to-weight ratio — ideal for general prototypes.',
    category: 'Aluminum',
    is_metal: true,
    density_g_cm3: 2.7,
    elastic_modulus_gpa: 69.0,
    hardness_hv: 95,
    max_operating_temp_c: 150,
    machinability_rating: 75,
    notes: 'Stable during machining; anodizes well.'
  },
  {
    id: '7075-T6',
    code: '7075-T6',
    name: 'Aluminum 7075-T6',
    description: 'High-strength aerospace alloy with reduced machinability.',
    category: 'Aluminum',
    is_metal: true,
    density_g_cm3: 2.81,
    elastic_modulus_gpa: 71.7,
    hardness_hv: 150,
    max_operating_temp_c: 120,
    machinability_rating: 55,
    notes: 'Expect higher tool wear; needs corrosion protection.'
  },
  {
    id: '304-SS',
    code: '304-SS',
    name: 'Stainless Steel 304',
    description: 'Austenitic stainless with excellent corrosion resistance for general use.',
    category: 'Stainless Steel',
    is_metal: true,
    density_g_cm3: 8.0,
    elastic_modulus_gpa: 193.0,
    hardness_hv: 150,
    max_operating_temp_c: 425,
    machinability_rating: 45,
    notes: 'Use flood coolant to mitigate work hardening.'
  },
  {
    id: '17-4-PH',
    code: '17-4-PH',
    name: 'Stainless Steel 17-4 PH',
    description: 'Precipitation-hardened stainless with high strength and hardness.',
    category: 'Stainless Steel',
    is_metal: true,
    density_g_cm3: 7.75,
    elastic_modulus_gpa: 200.0,
    hardness_hv: 350,
    max_operating_temp_c: 315,
    machinability_rating: 35,
    notes: 'Requires rigid fixturing; consider stress relief.'
  },
  {
    id: '4140-HT',
    code: '4140-HT',
    name: 'Alloy Steel 4140 HT',
    description: 'Pre-hardened chromoly steel for tooling and shafts.',
    category: 'Alloy Steel',
    is_metal: true,
    density_g_cm3: 7.85,
    elastic_modulus_gpa: 205.0,
    hardness_hv: 285,
    max_operating_temp_c: 500,
    machinability_rating: 40,
    notes: 'Maintain sharp tooling; moderate feeds.'
  },
  {
    id: 'PEEK-NT',
    code: 'PEEK-NT',
    name: 'PEEK (Natural)',
    description: 'High-performance thermoplastic for chemical and thermal resistance.',
    category: 'Polymer',
    is_metal: false,
    density_g_cm3: 1.3,
    elastic_modulus_gpa: 3.6,
    hardness_hv: null,
    max_operating_temp_c: 250,
    machinability_rating: 60,
    notes: 'Use razor-sharp tools, low chip load, and air blast.'
  }
];

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}/dfm/options/materials`, {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });

        if (response.ok) {
          const materials = await response.json();
          if (Array.isArray(materials) && materials.length > 0) {
            return NextResponse.json(materials);
          }
        }
      } catch (error) {
        console.warn('Falling back to mock DFM material options:', error);
      }
    }

    return NextResponse.json(FALLBACK_MATERIALS);
  } catch (error) {
    console.error('DFM materials fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material options' },
      { status: 500 }
    );
  }
}
