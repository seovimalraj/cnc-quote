import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const body = await request.json();

    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/orders/${params.orderId}/move`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to move order');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error moving order:', error);
    return NextResponse.json(
      { error: 'Failed to move order' },
      { status: 500 }
    );
  }
}
