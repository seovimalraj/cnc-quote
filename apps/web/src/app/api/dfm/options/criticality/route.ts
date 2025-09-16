import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get published DFM criticality options
    const { data: criticality, error } = await supabase
      .from('dfm_criticality_options')
      .select('*')
      .eq('published', true)
      .order('name');

    if (error) {
      console.error('Failed to fetch DFM criticality:', error);
      return NextResponse.json({ error: 'Failed to fetch criticality options' }, { status: 500 });
    }

    return NextResponse.json(criticality || []);

  } catch (error) {
    console.error('DFM criticality fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch criticality options' },
      { status: 500 }
    );
  }
}
