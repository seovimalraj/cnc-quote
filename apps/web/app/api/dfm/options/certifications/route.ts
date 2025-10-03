import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Comprehensive manufacturing certifications and standards
    const mockCertifications = [
      {
        id: 'iso-9001',
        name: 'ISO 9001:2015',
        description: 'Quality Management System - Foundation for consistent quality and customer satisfaction',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'as9100',
        name: 'AS9100D',
        description: 'Aerospace Quality Management System - Required for aerospace and defense applications',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'iso-13485',
        name: 'ISO 13485:2016',
        description: 'Medical Devices Quality Management - Required for FDA-regulated medical devices',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'iatf-16949',
        name: 'IATF 16949:2016',
        description: 'Automotive Quality Management System - Required for automotive supply chain',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'iso-14001',
        name: 'ISO 14001:2015',
        description: 'Environmental Management System - Demonstrates environmental responsibility',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'nadcap',
        name: 'NADCAP',
        description: 'Aerospace special process accreditation for heat treating, welding, coating',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'fda-510k',
        name: 'FDA 510(k)',
        description: 'FDA premarket notification for medical device manufacturing',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'rohs',
        name: 'RoHS Compliance',
        description: 'Restriction of Hazardous Substances - Required for electronics in EU',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'reach',
        name: 'REACH Compliance',
        description: 'EU chemical regulation for safe manufacture and use of chemicals',
        published: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'ppap',
        name: 'PPAP Level 3',
        description: 'Production Part Approval Process - Required for automotive suppliers',
        published: true,
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json(mockCertifications);

  } catch (error) {
    console.error('DFM certifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certification options' },
      { status: 500 }
    );
  }
}
