import { AdminDashboardStatsResponseVNextSchema } from '@cnc-quote/shared/contracts/vnext';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const buildTargetUrl = (request: Request): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for admin dashboard proxy');
  }

  const upstream = new URL('/admin/dashboard/stats', base.replace(/\/$/, ''));
  const search = new URL(request.url).searchParams;
  search.forEach((value, key) => {
    if (value !== null) {
      upstream.searchParams.set(key, value);
    }
  });
  return upstream.toString();
};

export async function GET(request: Request) {
  const upstream = await proxyFetch(request, buildTargetUrl(request), { method: 'GET' });
  return forwardJsonWithSchema(upstream, AdminDashboardStatsResponseVNextSchema);
}
