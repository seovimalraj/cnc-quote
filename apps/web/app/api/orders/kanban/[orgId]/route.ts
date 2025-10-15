import { KanbanBoardVNextSchema } from '@cnc-quote/shared/contracts/vnext';

import { forwardJsonWithSchema, proxyFetch } from '@/app/api/_lib/proxyFetch';

const buildUrl = (request: Request, orgId: string): string => {
  const base = process.env.NEST_BASE;
  if (!base) {
    throw new Error('NEST_BASE is not configured for org kanban proxy');
  }

  const target = new URL(`/admin/kanban/${orgId}`, base.replace(/\/$/, ''));
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    if (value !== null) {
      target.searchParams.set(key, value);
    }
  });
  target.searchParams.set('view', 'vnext');
  return target.toString();
};

export async function GET(request: Request, { params }: { params: { orgId: string } }) {
  const upstream = await proxyFetch(request, buildUrl(request, params.orgId), { method: 'GET' });
  return forwardJsonWithSchema(upstream, KanbanBoardVNextSchema);
}
