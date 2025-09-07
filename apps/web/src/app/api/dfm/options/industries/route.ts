import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get published DFM industry options
    const { data: industries, error } = await supabase
      .from('dfm_industry_options')
      .select('*')
      .eq('published', true)
      .order('name');

    if (error) {
      console.error('Failed to fetch DFM industries:', error);
      return NextResponse.json({ error: 'Failed to fetch industry options' }, { status: 500 });
    }

    return NextResponse.json(industries || []);

  } catch (error) {
    console.error('DFM industries fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch industry options' },
      { status: 500 }
    );
  }
}
