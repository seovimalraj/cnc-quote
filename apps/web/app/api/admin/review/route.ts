import { NextRequest } from 'next/server';

import { ContractsVNext } from '@cnc-quote/shared';
import { resolveApiUrl } from '@/app/api/_lib/backend';
import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest) {
  const target = new URL(resolveApiUrl('/admin/review'));
  const query = new URLSearchParams(request.nextUrl.searchParams);
  query.set('view', 'vnext');
  target.search = query.toString();

  const upstream = await proxyFetch(request, target, { method: 'GET' });
  return forwardJsonWithSchema(upstream, ContractsVNext.AdminReviewListSchema);
}
