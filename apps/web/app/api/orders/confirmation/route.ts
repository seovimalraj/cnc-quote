import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch order by Stripe session ID with RLS check
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .eq('organization_id', user.id) // RLS check
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });

  } catch (error) {
    console.error('Order confirmation fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}
