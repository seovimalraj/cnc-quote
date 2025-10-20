import { NextRequest } from 'next/server';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

interface RouteParams {
  params: {
    pageId: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const target = resolveApiUrl(`/admin/content/pages/${encodeURIComponent(params.pageId)}`);
  const body = await request.text();
  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['content-type'] = contentType;
  }

  const upstream = await proxyFetch(request, target, {
    method: 'PUT',
    body: body.length ? body : undefined,
    headers,
  });

  return buildProxyResponse(upstream);
}
