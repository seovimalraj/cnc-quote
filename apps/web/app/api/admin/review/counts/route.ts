import { NextRequest } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest) {
  const upstream = await proxyFetch(request, resolveApiUrl('/admin/review/counts'), {
    method: 'GET',
  });
  return upstream;
}
