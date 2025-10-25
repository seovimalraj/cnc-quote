import { NextRequest } from 'next/server';

import { proxyPutJson } from '@/app/api/_lib/backend';

export async function PUT(request: NextRequest, { params }: { params: { quoteId: string } }) {
  return proxyPutJson(request, `/admin/review/${encodeURIComponent(params.quoteId)}/assign`);
}
