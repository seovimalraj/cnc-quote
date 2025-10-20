import { NextRequest } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  const jobId = params.jobId;
  const target = new URL(resolveApiUrl(`/admin/queues/jobs/${encodeURIComponent(jobId)}/retry`));
  const search = new URLSearchParams(request.nextUrl.searchParams);
  target.search = search.toString();

  const upstream = await proxyFetch(request, target, { method: 'POST' });
  return upstream;
}
