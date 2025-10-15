import { proxyFetch } from '@/app/api/_lib/proxyFetch';

const buildUrl = (quoteId: string): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for quote reprice proxy');
  }
  return new URL(`/admin/quotes/${quoteId}/reprice`, base.replace(/\/$/, '')).toString();
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const upstream = await proxyFetch(request, buildUrl(params.id), {
    method: 'POST',
    body: await request.text(),
    headers: {
      'content-type': request.headers.get('content-type') ?? 'application/json',
    },
  });

  return upstream;
}
