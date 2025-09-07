import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const { quoteId, currency = 'usd', billingInfo, shippingInfo } = await request.json();

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const supabase = createClient();
    const cookieStore = cookies();

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

    if (quote.status !== 'Accepted') {
      return NextResponse.json({ error: 'Quote must be accepted before checkout' }, { status: 400 });
    }

    // Calculate total amount
    const totalAmount = Math.round(quote.subtotal * 100); // Convert to cents

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `CNC Quote #${quote.id}`,
              description: `${quote.lines.length} part${quote.lines.length > 1 ? 's' : ''}`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${quoteId}`,
      metadata: {
        quote_id: quoteId,
        organization_id: user.id,
        billing_email: billingInfo.email,
      },
      customer_email: billingInfo.email,
      payment_intent_data: {
        metadata: {
          quote_id: quoteId,
          organization_id: user.id,
        },
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
    });

    // Store checkout session info in database
    await supabase
      .from('checkout_sessions')
      .insert({
        id: session.id,
        quote_id: quoteId,
        organization_id: user.id,
        stripe_session_id: session.id,
        amount: totalAmount,
        currency: currency.toLowerCase(),
        billing_info: billingInfo,
        shipping_info: shippingInfo,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    // Log analytics event
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'checkout_started',
        quote_id: quoteId,
        organization_id: user.id,
        properties: {
          amount: totalAmount,
          currency: currency.toLowerCase(),
          line_count: quote.lines.length,
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
