import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileSize, contentType } = await request.json();

    if (!fileName || !fileSize || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, contentType' },
        { status: 400 }
      );
    }

    // Validate file size (200MB limit)
    if (fileSize > 200 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 200MB limit' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Generate unique file ID
    const fileId = `dfm_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Create file record in database
    const { error: fileError } = await supabase
      .from('dfm_files')
      .insert({
        id: fileId,
        file_name: fileName,
        file_path: `${fileId}_${fileName}`,
        file_size: fileSize,
        mime_type: contentType,
        organization_id: userOrg.org_id,
        uploaded_by: user.id,
        created_at: new Date().toISOString()
      });

    if (fileError) {
      console.error('Failed to create file record:', fileError);
      return NextResponse.json(
        { error: 'Failed to create file record' },
        { status: 500 }
      );
    }

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from('dfm-uploads')
      .createSignedUploadUrl(`${fileId}_${fileName}`);

    if (error) {
      console.error('Failed to create upload URL:', error);
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      fileId
    });

  } catch (error) {
    console.error('Error creating upload URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
