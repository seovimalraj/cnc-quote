import { ContractsVNext } from '@cnc-quote/shared';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { resolveApiUrl } from '@/app/api/_lib/backend';
import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const ShippingAddressSchema = z.object({
  company: z.string().optional().nullable(),
  attention: z.string().optional().nullable(),
  street1: z.string().min(1, 'street1 is required'),
  street2: z.string().optional().nullable(),
  city: z.string().min(1, 'city is required'),
  state_province: z.string().optional().nullable(),
  postal_code: z.string().min(1, 'postal_code is required'),
  country: z.string().min(2, 'country is required'),
  phone: z.string().optional().nullable(),
});

const ShippingRatesRequestSchema = z.object({
  quoteId: z.string().optional().nullable(),
  incoterm: z.string().optional(),
  address: ShippingAddressSchema,
});

type ShippingRatesRequest = z.infer<typeof ShippingRatesRequestSchema>;

type SchemaFailure = z.ZodError<ShippingRatesRequest> | SyntaxError | Error | string | null | undefined;

function schemaFailure(error: SchemaFailure): Response {
  let message = 'Invalid shipping rate request';

  if (error instanceof z.ZodError) {
    message = JSON.stringify(error.issues).slice(0, 2000);
  } else if (error instanceof SyntaxError) {
    message = 'Malformed JSON payload';
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return new Response(`Schema validation failed: ${message}`.trim(), {
    status: 400,
    headers: { 'content-type': 'text/plain' },
  });
}

const normalizeAddress = (address: ShippingRatesRequest['address']) => ({
  company: address.company ?? undefined,
  attention: address.attention ?? undefined,
  street1: address.street1,
  street2: address.street2 ?? undefined,
  city: address.city,
  state_province: address.state_province ?? undefined,
  postal_code: address.postal_code,
  country: address.country,
  phone: address.phone ?? undefined,
});

const buildUpstreamPayload = (payload: ShippingRatesRequest) => ({
  quote_id: payload.quoteId ?? undefined,
  incoterm: payload.incoterm ?? undefined,
  shipping_address: normalizeAddress(payload.address),
});

export async function POST(request: NextRequest) {
  let parsed: ShippingRatesRequest;

  try {
    const raw = await request.json();
    parsed = ShippingRatesRequestSchema.parse(raw);
  } catch (error) {
    return schemaFailure(error as SchemaFailure);
  }

  try {
    const upstream = await proxyFetch(request, resolveApiUrl('/shipping/rates'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildUpstreamPayload(parsed)),
    });

    return forwardJsonWithSchema(upstream, ContractsVNext.ShippingRatesSchema);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Failed to fetch shipping rates: ${message}`, {
      status: 502,
      headers: { 'content-type': 'text/plain' },
    });
  }
}
