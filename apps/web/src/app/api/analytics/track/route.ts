import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    const supabase = createClient();

    // Get the current user for organization_id
    const { data: { user } } = await supabase.auth.getUser();

    // Store analytics event
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: event.event_type,
        quote_id: event.quote_id,
        organization_id: user?.id || event.organization_id,
        properties: event.properties || {},
        created_at: event.created_at || new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to store analytics event:', error);
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
