/**
 * @module api/admin/webhooks/[provider]/replay
 * @ownership platform-ops
 * @description Forwards webhook replay commands to the API for a given provider.
 */
import { NextRequest } from 'next/server';

import { proxyFetch } from '@/app/api/_lib/proxyFetch';
import { resolveApiUrl } from '@/app/api/_lib/backend';

export async function POST(request: NextRequest, context: { params: { provider: string } }) {
  const { provider } = context.params;
  const sourceUrl = new URL(request.url);
  const target = new URL(resolveApiUrl(`/admin/webhooks/${encodeURIComponent(provider)}/replay`));
  sourceUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return proxyFetch(request, target, { method: 'POST' });
}
