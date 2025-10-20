/**
 * @module api/supplier/profile
 * @ownership supplier-portal
 * @description Proxies supplier profile lookups to the API service and validates the shared contract.
 */
import { SupplierProfileRespV1Schema } from '@cnc-quote/shared';
import { NextRequest } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

export async function GET(request: NextRequest) {
  const upstream = await proxyFetch(request, resolveApiUrl('/supplier/profile'), {
    method: 'GET',
  });

  return forwardJsonWithSchema(upstream, SupplierProfileRespV1Schema);
}
