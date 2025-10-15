import { proxyFetch } from '@/app/api/_lib/proxyFetch';

const buildUrl = (request: Request): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for admin abandoned export proxy');
  }

  const target = new URL('/admin/quotes/abandoned.csv', base.replace(/\/$/, ''));
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    if (value !== null) {
      target.searchParams.set(key, value);
    }
  });
  return target.toString();
};

export async function GET(request: Request) {
  const upstream = await proxyFetch(request, buildUrl(request), { method: 'GET' });
  const headers = new Headers(upstream.headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
