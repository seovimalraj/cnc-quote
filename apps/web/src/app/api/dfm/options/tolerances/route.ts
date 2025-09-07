import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get published DFM tolerance options
    const { data: tolerances, error } = await supabase
      .from('dfm_tolerance_options')
      .select('*')
      .eq('published', true)
      .order('name');

    if (error) {
      console.error('Failed to fetch DFM tolerances:', error);
      return NextResponse.json({ error: 'Failed to fetch tolerance options' }, { status: 500 });
    }

    return NextResponse.json(tolerances || []);

  } catch (error) {
    console.error('DFM tolerances fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tolerance options' },
      { status: 500 }
    );
  }
}
