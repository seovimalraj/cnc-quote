/**
 * @module api/admin/queues/[queue]/clean-completed
 * @ownership platform-ops
 * @description Proxies completed-job cleanup requests to the API while preserving the caller's query args.
 */
import { NextRequest } from 'next/server';

import { proxyFetch } from '@/app/api/_lib/proxyFetch';
import { resolveApiUrl } from '@/app/api/_lib/backend';

export async function POST(request: NextRequest, context: { params: { queue: string } }) {
  const { queue } = context.params;
  const source = new URL(request.url);
  const target = new URL(resolveApiUrl(`/admin/queues/${encodeURIComponent(queue)}/clean-completed`));

  source.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return proxyFetch(request, target, { method: 'POST' });
}
