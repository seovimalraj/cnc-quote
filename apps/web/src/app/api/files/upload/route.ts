import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileSize, contentType } = await request.json();

    // Validate file size (200MB limit)
    if (fileSize > 200 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 200MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/step', 'application/iges', 'application/sldprt',
      'model/stl', 'model/x_t', 'model/x_b', 'model/jt',
      'model/3mf', 'image/vnd.dxf', 'application/zip'
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Generate file ID and signed URL
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, this would generate a signed URL for Supabase Storage
    // For now, we'll return a mock signed URL
    const signedUrl = `https://mock-storage.example.com/upload/${fileId}`;

    return NextResponse.json({
      fileId,
      signedUrl,
      expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
    });

  } catch (error) {
    console.error('File upload preparation error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare file upload' },
      { status: 500 }
    );
  }
}
