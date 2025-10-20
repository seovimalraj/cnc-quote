import { NextRequest } from 'next/server';
import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest, { params }: { params: { runId: string } }) {
  const upstream = await proxyFetch(
    request,
    resolveApiUrl(`/admin/pricing/revision-assistant/${params.runId}`),
    { method: 'GET' },
  );
  return buildProxyResponse(upstream);
}
