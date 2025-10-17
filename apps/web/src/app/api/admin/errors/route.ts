/**
 * @module api/admin/errors
 * @ownership platform-ops
 * @description Proxies admin error snapshots (Sentry + failed jobs) and validates them against shared contracts.
 */
import { NextRequest } from 'next/server';
import { ContractsVNext } from '@cnc-quote/shared';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';
import { resolveApiUrl } from '@/app/api/_lib/backend';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const window = url.searchParams.get('window');
  const target = new URL(resolveApiUrl('/admin/errors'));
  if (window) {
    target.searchParams.set('window', window);
  }

  const upstream = await proxyFetch(request, target, { method: 'GET' });
  return forwardJsonWithSchema(upstream, ContractsVNext.AdminErrorSnapshotVNextSchema);
}
