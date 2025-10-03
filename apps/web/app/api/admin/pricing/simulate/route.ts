import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin pricing simulation proxy route
 * Forwards simulation parameters to backend /price/admin/simulate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const backendUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: 'API_BASE_URL not configured' }, { status: 500 });
    }

    const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/price/admin/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth if present (Supabase, bearer, etc.)
        Authorization: request.headers.get('authorization') || ''
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'Simulation failed' }, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Admin simulate proxy error', err);
    return NextResponse.json({ error: 'Internal simulation proxy error' }, { status: 500 });
  }
}
