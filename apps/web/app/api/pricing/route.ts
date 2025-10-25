import { ContractsVNext } from '@cnc-quote/shared';
import { NextRequest } from 'next/server';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

function schemaFailure(error: unknown): Response {
  let message = 'Invalid pricing payload';
  if (error && typeof error === 'object' && 'issues' in (error as Record<string, unknown>)) {
    try {
      message = JSON.stringify((error as Record<string, unknown>).issues).slice(0, 2000);
    } catch {
      message = 'Schema validation failed';
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  return new Response(`Schema validation failed: ${message}`.trim(), {
    status: 502,
    headers: { 'content-type': 'text/plain' },
  });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const light = ContractsVNext.PricingInputLightSchema.parse(payload);
  const currency = light.currency ?? 'USD';
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  const shouldTryV2 = light.lines.some((line) => Boolean(line.cadKey ?? line.partConfig));

  if (shouldTryV2) {
    try {
      const v2Request = ContractsVNext.toV2PricingRequest(light);
      const upstream = await proxyFetch(request, resolveApiUrl('/v1/price/v2/calculate'), {
        method: 'POST',
        body: JSON.stringify(v2Request),
        headers: { 'content-type': 'application/json' },
      });

      if (upstream.ok) {
        try {
          const body = await upstream.json();
          const computation = ContractsVNext.fromV2PricingResponse(body, currency);
          return Response.json(computation);
        } catch (error) {
          return schemaFailure(error);
        }
      }

      lastResponse = upstream;
    } catch (error) {
      // Unable to build or execute v2 request; continue to fallbacks
      lastError = lastError ?? error;
    }
  }

  try {
    const legacyRequest = ContractsVNext.toLegacyPricingRequest(light);
    const upstream = await proxyFetch(request, resolveApiUrl('/v1/price'), {
      method: 'POST',
      body: JSON.stringify(legacyRequest),
      headers: { 'content-type': 'application/json' },
    });

    if (upstream.ok) {
      try {
        const body = await upstream.json();
        const computation = ContractsVNext.fromLegacyPricingResponse(body, currency);
        return Response.json(computation);
      } catch (error) {
        return schemaFailure(error);
      }
    }

    lastResponse = upstream;
  } catch (error) {
    lastError = lastError ?? error;
  }

  if (lastResponse) {
    return lastResponse;
  }

  try {
    const estimate = ContractsVNext.computeDeterministicEstimate(light);
    return Response.json(estimate);
  } catch (error) {
    return schemaFailure(lastError ?? error);
  }
}
