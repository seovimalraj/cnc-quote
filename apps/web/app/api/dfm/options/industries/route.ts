import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Comprehensive industry categories with specific requirements
    const mockIndustries = [
      {
        id: 'aerospace',
        name: 'Aerospace & Defense',
        description: 'High-performance applications requiring AS9100 compliance, strict traceability, and advanced materials',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'automotive',
        name: 'Automotive',
        description: 'Automotive components requiring IATF 16949 compliance, high-volume production capability',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'medical',
        name: 'Medical Devices',
        description: 'FDA-regulated medical devices requiring ISO 13485 compliance and biocompatible materials',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'semiconductor',
        name: 'Semiconductor & Electronics',
        description: 'Precision electronic components, clean room requirements, ESD protection',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'energy',
        name: 'Energy & Oil/Gas',
        description: 'Energy sector components requiring NACE, API standards for harsh environments',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'marine',
        name: 'Marine & Offshore',
        description: 'Marine applications requiring corrosion resistance and DNV GL compliance',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'food-beverage',
        name: 'Food & Beverage',
        description: 'Food-grade applications requiring FDA materials and sanitary design principles',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'industrial',
        name: 'Industrial Equipment',
        description: 'General industrial machinery and equipment manufacturing',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'consumer',
        name: 'Consumer Products',
        description: 'Consumer goods requiring cost-effective manufacturing and aesthetic considerations',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'research',
        name: 'Research & Development',
        description: 'Prototype and low-volume production for research applications',
        published: true,
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json(mockIndustries);

  } catch (error) {
    console.error('DFM industries fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch industry options' },
      { status: 500 }
    );
  }
}
