import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get published DFM finish options
    const { data: finishes, error } = await supabase
      .from('dfm_finish_options')
      .select('*')
      .eq('published', true)
      .order('name');

    if (error) {
      console.error('Failed to fetch DFM finishes:', error);
      return NextResponse.json({ error: 'Failed to fetch finish options' }, { status: 500 });
    }

    return NextResponse.json(finishes || []);

  } catch (error) {
    console.error('DFM finishes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finish options' },
      { status: 500 }
    );
  }
}
