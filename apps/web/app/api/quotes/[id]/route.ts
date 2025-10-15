import { NextRequest } from 'next/server';
import { proxyGetJson, proxyPutJson } from '@/app/api/_lib/backend';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const search = request.nextUrl.searchParams.toString();
  const suffix = search ? `?${search}` : '';
  return proxyGetJson(request, `/quotes/${encodeURIComponent(params.id)}${suffix}`);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return proxyPutJson(request, `/quotes/${encodeURIComponent(params.id)}`);
}
