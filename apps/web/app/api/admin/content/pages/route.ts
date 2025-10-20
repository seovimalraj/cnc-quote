import { NextRequest } from 'next/server';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest) {
  const target = new URL(resolveApiUrl('/admin/content/pages'));
  const search = new URLSearchParams(request.nextUrl.searchParams);
  target.search = search.toString();

  const upstream = await proxyFetch(request, target, { method: 'GET' });
  return buildProxyResponse(upstream);
}

export async function POST(request: NextRequest) {
  const target = resolveApiUrl('/admin/content/pages');
  const body = await request.text();
  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['content-type'] = contentType;
  }

  const upstream = await proxyFetch(request, target, {
    method: 'POST',
    body: body.length ? body : undefined,
    headers,
  });

  return buildProxyResponse(upstream);
}
