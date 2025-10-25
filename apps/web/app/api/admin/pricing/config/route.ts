import { NextRequest } from 'next/server';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest) {
  const upstream = await proxyFetch(request, resolveApiUrl('/v1/admin/pricing/config'), {
    method: 'GET',
  });
  return buildProxyResponse(upstream);
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.length > 0) {
    headers['content-type'] = contentType;
  }

  const upstream = await proxyFetch(request, resolveApiUrl('/v1/admin/pricing/config'), {
    method: 'PUT',
    body: body.length > 0 ? body : undefined,
    headers,
  });

  return buildProxyResponse(upstream);
}
