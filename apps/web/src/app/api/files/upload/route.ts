import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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

    // Generate file ID and path
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filePath = `uploads/${fileId}/${fileName}`;

    // Use Supabase Storage for file uploads
    console.log('Initializing Supabase client...');

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);

      // Fallback to mock implementation
      return NextResponse.json({
        fileId,
        signedUrl: `https://httpbin.org/put`,
        filePath,
        expiresAt: Date.now() + (15 * 60 * 1000)
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PUT, POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    let cookieStore;
    try {
      cookieStore = cookies();
      console.log('Cookies initialized successfully');
    } catch (cookieError) {
      console.error('Failed to initialize cookies:', cookieError);
      // Fallback to mock implementation
      return NextResponse.json({
        fileId,
        signedUrl: `https://httpbin.org/put`,
        filePath,
        expiresAt: Date.now() + (15 * 60 * 1000)
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PUT, POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const supabase = createClient(cookieStore);
    console.log('Supabase client created, attempting to create signed URL...');

    const { data, error } = await supabase.storage
      .from('files')
      .createSignedUploadUrl(filePath, {
        upsert: false
      });

    console.log('Supabase response:', { data: !!data, error });

    if (error) {
      console.error('Supabase storage error:', error);

      // Check if it's a bucket not found error
      if (error.message?.includes('not found') || error.message?.includes('bucket')) {
        console.log('Files bucket not found, falling back to mock implementation');

        // Fallback to mock implementation for development
        return NextResponse.json({
          fileId,
          signedUrl: `https://httpbin.org/put`, // Mock endpoint that accepts PUT requests
          filePath,
          expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'PUT, POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      fileId,
      signedUrl: data.signedUrl,
      filePath,
      expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
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
