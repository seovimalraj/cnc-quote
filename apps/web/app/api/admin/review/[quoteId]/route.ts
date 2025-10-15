import { ContractsVNext } from '@cnc-quote/shared';
import { NextRequest, NextResponse } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(
  request: NextRequest,
  { params }: { params: { quoteId: string } },
) {
  const target = new URL(resolveApiUrl(`/admin/review/${encodeURIComponent(params.quoteId)}`));
  target.searchParams.set('view', 'vnext');

  const upstream = await proxyFetch(request, target, { method: 'GET' });
  return forwardJsonWithSchema(upstream, ContractsVNext.AdminReviewDetailSchema);
}

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/admin/review/[quoteId]/simulate for simulations' },
    { status: 405 },
  );
}
