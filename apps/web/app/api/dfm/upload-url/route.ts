import { NextRequest, NextResponse } from 'next/server';

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

    // Validate supported file types
    const supportedTypes = [
      'application/step', 'application/x-step',
      'application/iges', 'application/x-iges',
      'application/sla', 'model/stl',
      'application/x-parasolid', 'model/x_t', 'model/x_b',
      'application/sldprt',
      'model/jt',
      'application/3mf', 'model/3mf',
      'image/vnd.dxf', 'application/dxf',
      'application/zip'
    ];

    if (!supportedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Generate unique file ID
    const fileId = `dfm_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const mockUploadUrl = `https://localhost/api/dfm/mock-upload/${fileId}`;

    // Return mock upload URL for development
    // In production, this would integrate with cloud storage (S3, Supabase Storage, etc.)
    return NextResponse.json({
      success: true,
      uploadUrl: mockUploadUrl,
      fileId,
      message: 'Mock upload URL generated successfully',
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour from now
    });

  } catch (error) {
    console.error('Error creating upload URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
