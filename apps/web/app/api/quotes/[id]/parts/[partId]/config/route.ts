import { NextRequest } from 'next/server';

import { proxyPatchJson } from '@/app/api/_lib/backend';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; partId: string } }
) {
  return proxyPatchJson(
    request,
    `/quotes/${encodeURIComponent(params.id)}/parts/${encodeURIComponent(params.partId)}/config`
  );
}
