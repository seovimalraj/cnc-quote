import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user (optional for public access)
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch DFM request with results
    const { data: dfmRequest, error } = await supabase
      .from('dfm_requests')
      .select(`
        *,
        file:dfm_files(file_name),
        results:dfm_results(*)
      `)
      .eq('id', requestId)
      .eq('organization_id', user?.id) // RLS check
      .single();

    if (error || !dfmRequest) {
      return NextResponse.json({ error: 'DFM request not found' }, { status: 404 });
    }

    // Format the response
    const response = {
      id: dfmRequest.id,
      status: dfmRequest.status,
      file_name: dfmRequest.file?.file_name || 'Unknown file',
      created_at: dfmRequest.created_at,
      tolerance_pack: dfmRequest.tolerance_pack,
      surface_finish: dfmRequest.surface_finish,
      industry: dfmRequest.industry,
      criticality: dfmRequest.criticality,
      results: dfmRequest.results ? {
        id: dfmRequest.results.id,
        request_id: dfmRequest.results.request_id,
        checks: dfmRequest.results.checks || [],
        summary: dfmRequest.results.summary || {},
        viewer_mesh_id: dfmRequest.results.viewer_mesh_id,
        report_pdf_id: dfmRequest.results.report_pdf_id,
        qap_pdf_id: dfmRequest.results.qap_pdf_id,
        created_at: dfmRequest.results.created_at
      } : null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('DFM request fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DFM request' },
      { status: 500 }
    );
  }
}
