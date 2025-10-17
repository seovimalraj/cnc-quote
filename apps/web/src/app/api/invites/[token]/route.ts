/**
 * @module api/invites/[token]
 * @ownership platform-identity
 * @description Proxies invite introspection requests to the NestJS API with contract validation.
 */
import { NextRequest } from 'next/server';
import { ContractsVNext } from '@cnc-quote/shared';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';
import { resolveApiUrl } from '@/app/api/_lib/backend';

export async function GET(
  request: NextRequest,
  context: { params: { token: string } },
) {
  const { token } = context.params;
  const target = resolveApiUrl(`/invites/${encodeURIComponent(token)}`);
  const upstream = await proxyFetch(request, target, { method: 'GET' });
  return forwardJsonWithSchema(upstream, ContractsVNext.OrgInviteDetailsSchema);
}
