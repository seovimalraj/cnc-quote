import { NextRequest } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function POST(
  request: NextRequest,
  { params }: { params: { quoteId: string } },
) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.length > 0) {
    headers['content-type'] = contentType;
  }

  const upstream = await proxyFetch(
    request,
    resolveApiUrl(`/admin/review/${encodeURIComponent(params.quoteId)}/simulate`),
    {
      method: 'POST',
      body: body.length > 0 ? body : undefined,
      headers,
    },
  );

  return upstream;
}
