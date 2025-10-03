import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || 'https://localhost/api';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }
  try {
    const resp = await fetch(`${API_BASE}/payments/paypal/capture/${orderId}`, { method: 'POST' });
    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json({ error: 'Backend capture failed', detail: txt }, { status: 502 });
    }
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: 'Capture exception', detail: e.message }, { status: 500 });
  }
}
