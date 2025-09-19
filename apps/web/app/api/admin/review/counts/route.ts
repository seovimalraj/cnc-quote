import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const mockCounts = {
      needs_review: 1,
      priced: 0,
      sent: 0,
      total: 1
    };

    return NextResponse.json(mockCounts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
