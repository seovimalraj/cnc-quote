import { UploadPresignSchema, UploadSpecSchema, type UploadSpec } from '@cnc-quote/shared/contracts/vnext';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const ensureBase = (): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for file presign proxy');
  }
  return base.replace(/\/$/, '');
};

const buildUrl = (): string => new URL('/files/presign', ensureBase()).toString();

const badRequest = (message: string): Response =>
  new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });

const normalizeSpec = (spec: UploadSpec) => {
  const size = spec.size ?? spec.byteLength;
  const byteLength = spec.byteLength ?? spec.size;
  return {
    ...spec,
    ...(size !== undefined ? { size } : {}),
    ...(byteLength !== undefined ? { byteLength } : {}),
  };
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Invalid JSON payload');
  }

  const parseResult = UploadSpecSchema.safeParse(payload);
  if (!parseResult.success) {
    return badRequest('Upload specification failed validation');
  }

  const normalized = normalizeSpec(parseResult.data);

  const upstream = await proxyFetch(request, buildUrl(), {
    method: 'POST',
    body: JSON.stringify(normalized),
    headers: { 'content-type': 'application/json' },
  });

  return forwardJsonWithSchema(upstream, UploadPresignSchema);
}
