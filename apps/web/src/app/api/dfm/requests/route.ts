import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const {
      fileId,
      tolerancePack,
      surfaceFinish,
      industry,
      certifications,
      criticality,
      notes
    } = await request.json();

    if (!fileId || !tolerancePack || !surfaceFinish || !industry || !criticality) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user (optional for public DFM analysis)
    const { data: { user } } = await supabase.auth.getUser();

    // Verify file exists and belongs to user
    const { data: fileData, error: fileError } = await supabase
      .from('dfm_files')
      .select('*')
      .eq('id', fileId)
      .eq('organization_id', user?.id)
      .single();

    if (fileError || !fileData) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 });
    }

    // Create DFM request
    const requestId = uuidv4();
    const { error: requestError } = await supabase
      .from('dfm_requests')
      .insert({
        id: requestId,
        file_id: fileId,
        file_name: fileData.file_name,
        organization_id: user?.id,
        user_id: user?.id,
        tolerance_pack: tolerancePack,
        surface_finish: surfaceFinish,
        industry,
        certifications: certifications || [],
        criticality,
        notes,
        status: 'Queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (requestError) {
      console.error('Failed to create DFM request:', requestError);
      return NextResponse.json({ error: 'Failed to create DFM request' }, { status: 500 });
    }

    // Log analytics event
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'dfm_analysis_started',
        organization_id: user?.id,
        properties: {
          file_id: fileId,
          tolerance_pack: tolerancePack,
          surface_finish: surfaceFinish,
          industry,
          criticality,
          has_certifications: (certifications || []).length > 0,
        },
        created_at: new Date().toISOString(),
      });

    // For now, we'll simulate the job queue by calling the backend API
    // In production, this would be handled by the queue system
    try {
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/dfm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          fileId,
          downloadUrl: '', // Would be populated by the job processor
        })
      });

      if (!backendResponse.ok) {
        console.error('Failed to enqueue DFM analysis job');
        // Don't fail the request, just log the error
      }
    } catch (enqueueError) {
      console.error('Error enqueuing DFM analysis:', enqueueError);
      // Don't fail the request
    }

    return NextResponse.json({
      id: requestId,
      status: 'Queued',
      message: 'DFM analysis request created and queued successfully'
    });

  } catch (error) {
    console.error('DFM request creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create DFM request' },
      { status: 500 }
    );
  }
}
