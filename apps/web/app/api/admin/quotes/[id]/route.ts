import { AdminReviewDetailResponseVNextSchema } from '@cnc-quote/shared/contracts/vnext';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const getNestBase = (): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for admin quote proxy');
  }
  return base.replace(/\/$/, '');
};

const buildDetailUrl = (id: string): string => {
  const base = getNestBase();
  const url = new URL(`/admin/quotes/${encodeURIComponent(id)}`, base);
  url.searchParams.set('view', 'vnext');
  return url.toString();
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const upstream = await proxyFetch(request, buildDetailUrl(params.id), { method: 'GET' });
  return forwardJsonWithSchema(upstream, AdminReviewDetailResponseVNextSchema);
}

const serializeBody = async (request: Request): Promise<string | undefined> => {
  const raw = await request.text();
  return raw.length > 0 ? raw : undefined;
};

const forwardMutation = async (
  request: Request,
  method: 'PUT' | 'PATCH',
  id: string,
): Promise<Response> => {
  const body = await serializeBody(request);
  const headers = body
    ? { 'content-type': request.headers.get('content-type') ?? 'application/json' }
    : undefined;

  return proxyFetch(request, buildDetailUrl(id), {
    method,
    body,
    headers,
  });
};

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  return forwardMutation(request, 'PUT', params.id);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return forwardMutation(request, 'PATCH', params.id);
}
