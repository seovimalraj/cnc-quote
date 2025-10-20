/**
 * @module AdminQuotesProxyRoute
 * @ownership web/admin
 * @purpose Proxy admin quote list requests to the Nest API while enforcing vNext schemas.
 */
import { AdminReviewListResponseVNextSchema } from '@cnc-quote/shared/contracts/vnext';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const buildUrl = (request: Request): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for admin quotes proxy');
  }

  const target = new URL('/admin/quotes', base.replace(/\/$/, ''));
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    if (value !== null) {
      target.searchParams.set(key, value);
    }
  });
  target.searchParams.set('view', 'vnext');
  return target.toString();
};

export async function GET(request: Request) {
  const upstream = await proxyFetch(request, buildUrl(request), { method: 'GET' });
  return forwardJsonWithSchema(upstream, AdminReviewListResponseVNextSchema);
}
