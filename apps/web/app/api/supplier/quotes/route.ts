/**
 * @module api/supplier/quotes
 * @ownership supplier-portal
 * @description Streams supplier quote assignments through the API gateway with schema guarantees.
 */
import { SupplierQuotesRespV1Schema } from '@cnc-quote/shared';
import { NextRequest } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest) {
  const upstream = await proxyFetch(request, resolveApiUrl('/supplier/quotes'), {
    method: 'GET',
  });

  return forwardJsonWithSchema(upstream, SupplierQuotesRespV1Schema);
}
