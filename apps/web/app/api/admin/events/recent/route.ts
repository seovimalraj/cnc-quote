import { NextRequest } from 'next/server';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest) {
  const target = new URL(resolveApiUrl('/admin/events/recent'));
  const search = new URLSearchParams(request.nextUrl.searchParams);
  target.search = search.toString();

  const upstream = await proxyFetch(request, target, { method: 'GET' });
  return buildProxyResponse(upstream);
}
