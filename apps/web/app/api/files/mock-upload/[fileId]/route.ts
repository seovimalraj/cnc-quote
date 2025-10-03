import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const { fileId } = params;
    
    console.log(`Mock file upload received for fileId: ${fileId}`);
    
    // In a real implementation, this would store the file to cloud storage
    // For demo purposes, we'll just log the upload and return success
    
    const contentLength = request.headers.get('content-length');
    const contentType = request.headers.get('content-type');
    
    console.log(`File upload details:`, {
      fileId,
      contentLength,
      contentType,
      timestamp: new Date().toISOString()
    });

    // Simulate upload processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Mock upload error:', error);
    
    return NextResponse.json(
      { error: 'Mock upload failed' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}