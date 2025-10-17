/**
 * @module api/admin/queues/jobs/[jobId]/retry
 * @ownership platform-ops
 * @description Forwards single-job retry requests to the API queue monitor.
 */
import { NextRequest } from 'next/server';

import { proxyFetch } from '@/app/api/_lib/proxyFetch';
import { resolveApiUrl } from '@/app/api/_lib/backend';

export async function POST(request: NextRequest, context: { params: { jobId: string } }) {
  const { jobId } = context.params;
  const sourceUrl = new URL(request.url);
  const target = new URL(resolveApiUrl(`/admin/queues/jobs/${encodeURIComponent(jobId)}/retry`));
  sourceUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return proxyFetch(request, target, { method: 'POST' });
}
