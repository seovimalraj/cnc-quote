import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get published DFM certification options
    const { data: certifications, error } = await supabase
      .from('dfm_certification_options')
      .select('*')
      .eq('published', true)
      .order('name');

    if (error) {
      console.error('Failed to fetch DFM certifications:', error);
      return NextResponse.json({ error: 'Failed to fetch certification options' }, { status: 500 });
    }

    return NextResponse.json(certifications || []);

  } catch (error) {
    console.error('DFM certifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certification options' },
      { status: 500 }
    );
  }
}
