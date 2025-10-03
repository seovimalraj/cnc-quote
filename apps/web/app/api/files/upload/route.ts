import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('File upload request received');

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
      console.log('Request body parsed:', body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { fileName, fileSize, contentType } = body;

    // Validate required fields
    if (!fileName || !fileSize || !contentType) {
      console.error('Missing required fields:', { fileName, fileSize, contentType });
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, contentType' },
        { status: 400 }
      );
    }

    console.log('File details:', { fileName, fileSize, contentType });

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
      'model/3mf', 'model/obj', 'model/ply', 'image/vnd.dxf',
      'application/zip', 'application/x-zip-compressed',
      'application/octet-stream'
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // For now, use mock file handling since database is not fully configured
    const fileId = uuidv4();
    const filePath = `quote-uploads/${fileId}/${fileName}`;

    // For development/demo, create a mock signed URL that will be handled by the frontend
    // In production, this would be a real cloud storage signed URL
    const mockSignedUrl = `https://quote.frigate.ai/api/files/mock-upload/${fileId}`;

    console.log(`Created mock signed URL for ${fileName}: ${mockSignedUrl}`);

    return NextResponse.json({
      fileId,
      signedUrl: mockSignedUrl,
      filePath,
      expiresAt: Date.now() + (3600 * 1000), // 1 hour
      message: 'File upload prepared successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('File upload preparation error:', error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
      name: error instanceof Error ? error.name : 'Unknown'
    });

    return NextResponse.json(
      {
        error: 'Failed to prepare file upload',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
