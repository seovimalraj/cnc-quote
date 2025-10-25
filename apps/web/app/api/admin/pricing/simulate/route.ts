import { NextRequest } from 'next/server';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

/**
 * Admin pricing simulation proxy route
 * Forwards simulation parameters to backend /price/admin/simulate
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.length > 0) {
    headers['content-type'] = contentType;
  }

  const upstream = await proxyFetch(request, resolveApiUrl('/v1/price/admin/simulate'), {
    method: 'POST',
    body: body.length > 0 ? body : undefined,
    headers,
  });

  return buildProxyResponse(upstream);
}
