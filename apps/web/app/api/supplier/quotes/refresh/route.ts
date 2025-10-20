/**
 * @module api/supplier/quotes/refresh
 * @ownership supplier-portal
 * @description Forces a supplier quote resynchronization via the API while enforcing shared contracts.
 */
import { SupplierQuotesRespV1Schema } from '@cnc-quote/shared';
import { NextRequest } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function POST(request: NextRequest) {
  const upstream = await proxyFetch(request, resolveApiUrl('/supplier/quotes/refresh'), {
    method: 'POST',
  });

  return forwardJsonWithSchema(upstream, SupplierQuotesRespV1Schema);
}
