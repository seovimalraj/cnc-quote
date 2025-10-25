import { NextRequest } from 'next/server';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function POST(request: NextRequest) {
  const upstream = await proxyFetch(request, resolveApiUrl('/v1/price/v2/recalculate'), {
    method: 'POST',
    body: await request.text(),
    headers: {
      'content-type': request.headers.get('content-type') || 'application/json',
    },
  });

  return buildProxyResponse(upstream);
}
