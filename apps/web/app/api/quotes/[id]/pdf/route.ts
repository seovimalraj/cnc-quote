import { NextRequest } from 'next/server';

import { proxyGetJson } from '@/app/api/_lib/backend';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return proxyGetJson(request, `/quotes/${encodeURIComponent(params.id)}/pdf`, {
    headers: { Accept: 'application/pdf' },
  });
}
