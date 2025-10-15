import { ContractsVNext } from '@cnc-quote/shared';

import { proxyFetch } from '@/app/api/_lib/proxyFetch';

const ensureBase = (): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for pricing proxy');
  }
  return base.replace(/\/$/, '');
};

const buildUrl = (path: string): string => new URL(path, ensureBase()).toString();

const allowEstimateFallback = () => {
  const flag = process.env.ALLOW_ESTIMATE_FALLBACK;
  if (!flag) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(flag.toLowerCase());
};

const schemaFailure = (error: unknown): Response => {
  let message = 'Invalid pricing payload';
  if (error && typeof error === 'object' && 'issues' in (error as Record<string, unknown>)) {
    try {
      message = JSON.stringify((error as Record<string, unknown>).issues).slice(0, 2000);
    } catch {
      message = 'Schema validation failed';
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return new Response(`Schema validation failed: ${message}`.trim(), {
    status: 502,
    headers: { 'content-type': 'text/plain' },
  });
};

type PricingAttemptOutcome = {
  success?: Response;
  upstream?: Response | null;
  error?: unknown;
};

const executePricingAttempts = async (
  request: Request,
  light: ContractsVNext.PricingInputLight,
  currency: string,
): Promise<PricingAttemptOutcome> => {
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  const attempts = [
    {
      enabled: light.lines.some((line) => Boolean(line.cadKey ?? line.partConfig)),
      url: buildUrl('/admin/price/v2/calculate'),
      payload: () => ContractsVNext.toV2PricingRequest(light),
      transform: (body: unknown) => ContractsVNext.fromV2PricingResponse(body, currency),
    },
    {
      enabled: true,
      url: buildUrl('/admin/price/legacy/calculate'),
      payload: () => ContractsVNext.toLegacyPricingRequest(light),
      transform: (body: unknown) => ContractsVNext.fromLegacyPricingResponse(body, currency),
    },
  ] as const;

  for (const attempt of attempts) {
    if (!attempt.enabled) {
      continue;
    }

    let requestBody: Record<string, unknown>;
    try {
      requestBody = attempt.payload();
    } catch (error) {
      lastError = lastError ?? error;
      continue;
    }

    try {
      const upstream = await proxyFetch(request, attempt.url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'content-type': 'application/json' },
      });

      if (upstream.ok) {
        try {
          const body = await upstream.json();
          const computation = attempt.transform(body);
          return { success: Response.json(computation) };
        } catch (error) {
          return { success: schemaFailure(error) };
        }
      }

      lastResponse = upstream;
    } catch (error) {
      lastError = lastError ?? error;
    }
  }

  return { upstream: lastResponse, error: lastError };
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return schemaFailure(error);
  }

  let light;
  try {
    light = ContractsVNext.PricingInputLightSchema.parse(payload);
  } catch (error) {
    return schemaFailure(error);
  }

  const currency = light.currency ?? 'USD';
  const outcome = await executePricingAttempts(request, light, currency);

  if (outcome.success) {
    return outcome.success;
  }

  if (outcome.upstream) {
    return outcome.upstream;
  }

  if (allowEstimateFallback()) {
    try {
      const estimate = ContractsVNext.computeDeterministicEstimate(light);
      return Response.json({
        ...estimate,
        metadata: {
          ...(estimate.metadata ?? {}),
          badge: 'estimate',
        },
      });
    } catch (error) {
      return schemaFailure(outcome.error ?? error);
    }
  }

  const detail = outcome.error instanceof Error ? outcome.error.message : 'Pricing request failed';
  return new Response(JSON.stringify({ error: detail }), {
    status: 502,
    headers: { 'content-type': 'application/json' },
  });
}
