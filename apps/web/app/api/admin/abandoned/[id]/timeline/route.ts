import { QuoteTimelineVNextSchema } from '@cnc-quote/shared/contracts/vnext';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const buildUrl = (request: Request, quoteId: string): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for admin timeline proxy');
  }

  const target = new URL(`/admin/quotes/${quoteId}/timeline`, base.replace(/\/$/, ''));
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    if (value !== null) {
      target.searchParams.set(key, value);
    }
  });
  target.searchParams.set('view', 'vnext');
  return target.toString();
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const upstream = await proxyFetch(request, buildUrl(request, params.id), { method: 'GET' });
  return forwardJsonWithSchema(upstream, QuoteTimelineVNextSchema);
}
