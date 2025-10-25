import { NextRequest } from 'next/server';

import { proxyPostJson } from '@/app/api/_lib/backend';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyPostJson(request, `/files/${encodeURIComponent(params.id)}/complete`);
}
