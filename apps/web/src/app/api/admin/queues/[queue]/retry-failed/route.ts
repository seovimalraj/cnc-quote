/**
 * @module api/admin/queues/[queue]/retry-failed
 * @ownership platform-ops
 * @description Forwards queue retry requests to the API to clear failed jobs for a single queue.
 */
import { NextRequest } from 'next/server';

import { proxyFetch } from '@/app/api/_lib/proxyFetch';
import { resolveApiUrl } from '@/app/api/_lib/backend';

export async function POST(request: NextRequest, context: { params: { queue: string } }) {
  const { queue } = context.params;
  const sourceUrl = new URL(request.url);
  const target = new URL(resolveApiUrl(`/admin/queues/${encodeURIComponent(queue)}/retry-failed`));
  sourceUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return proxyFetch(request, target, { method: 'POST' });
}
