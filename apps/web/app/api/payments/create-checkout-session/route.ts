import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This route now proxies to the backend NestJS payments endpoint (PayPal only)
// It performs auth/RLS validation (quote ownership) before proxying.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || 'https://localhost/api';

export async function POST(request: NextRequest) {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

  const supabase = await createClient();

    // Get the current user/organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch the quote with RLS check
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        lines:quote_lines(*),
        selected_lead_option:lead_options(*)
      `)
      .eq('id', quoteId)
      .eq('organization_id', user.id) // RLS check
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Proxy to backend create checkout session (PayPal)
    const backendResp = await fetch(`${API_BASE}/payments/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId }),
    });

    if (!backendResp.ok) {
      const err = await backendResp.text();
      return NextResponse.json({ error: 'Backend payment session failed', detail: err }, { status: 502 });
    }

    const data = await backendResp.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('PayPal checkout session creation error:', error);
    return NextResponse.json({ error: 'Failed to create PayPal checkout session' }, { status: 500 });
  }
}
