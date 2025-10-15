import { MaterialListVNextSchema } from '@cnc-quote/shared/contracts/vnext';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const buildUrl = (): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for admin DFM options proxy');
  }
  const url = new URL('/admin/dfm/options/materials', base.replace(/\/$/, ''));
  url.searchParams.set('view', 'vnext');
  return url.toString();
};

export async function GET(request: Request) {
  const upstream = await proxyFetch(request, buildUrl(), { method: 'GET' });
  return forwardJsonWithSchema(upstream, MaterialListVNextSchema);
}
