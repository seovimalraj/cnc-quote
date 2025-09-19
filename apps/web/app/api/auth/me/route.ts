import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
