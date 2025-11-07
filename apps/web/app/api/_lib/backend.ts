import { NextRequest, NextResponse } from 'next/server';

import { getAuthContext } from '@/lib/getAuthContext';

export async function buildProxyResponse(response: Response): Promise<NextResponse> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const text = await response.text();
    const data = text.length ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  const headers: Record<string, string> = {};

  if (contentType) {
    headers['content-type'] = contentType;
  }

  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition) {
    headers['content-disposition'] = contentDisposition;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    headers['content-length'] = contentLength;
  }

  return new NextResponse(buffer, {
    status: response.status,
    headers,
  });
}

function resolveApiBase(): string {
  const candidates = [
    process.env.API_BASE_URL,
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ];

  let base = candidates.find((entry) => typeof entry === 'string' && entry.length > 0) ?? '';

  // If base is missing or relative, default to internal API host without version prefix.
  if (!base || base.startsWith('/')) {
    base = 'http://api:3001';
  }

  return base.replace(/\/$/, '');
}

export function resolveApiUrl(path: string): string {
  const base = resolveApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function proxyJsonWithBody(
  request: NextRequest,
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  options: { requireOrg?: boolean; headers?: Record<string, string> } = {},
): Promise<NextResponse> {
  const { requireOrg = true, headers: extraHeaders = {} } = options;

  try {
    const { session, orgId } = await getAuthContext();
    const token = session?.access_token;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requireOrg && !orgId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const url = resolveApiUrl(path);
    const contentType = request.headers.get('content-type') ?? 'application/json';
    const rawBody = await request.text();
    const body = rawBody.length > 0 ? rawBody : undefined;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(orgId ? { 'X-Org-Id': orgId } : {}),
        ...(body ? { 'Content-Type': contentType } : {}),
        ...extraHeaders,
      },
      body,
    });

    return buildProxyResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function proxyGetJson(
  request: NextRequest,
  path: string,
  options: { requireOrg?: boolean; headers?: Record<string, string> } = {},
): Promise<NextResponse> {
  const { requireOrg = true, headers: extraHeaders = {} } = options;

  try {
    const { session, orgId } = await getAuthContext();
    const token = session?.access_token;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requireOrg && !orgId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const url = resolveApiUrl(path);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(orgId ? { 'X-Org-Id': orgId } : {}),
        ...extraHeaders,
      },
    });

    return buildProxyResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function proxyPostJson(
  request: NextRequest,
  path: string,
  options: { requireOrg?: boolean; headers?: Record<string, string> } = {},
): Promise<NextResponse> {
  return proxyJsonWithBody(request, path, 'POST', options);
}

export async function proxyPutJson(
  request: NextRequest,
  path: string,
  options: { requireOrg?: boolean; headers?: Record<string, string> } = {},
): Promise<NextResponse> {
  return proxyJsonWithBody(request, path, 'PUT', options);
}

export async function proxyPatchJson(
  request: NextRequest,
  path: string,
  options: { requireOrg?: boolean; headers?: Record<string, string> } = {},
): Promise<NextResponse> {
  return proxyJsonWithBody(request, path, 'PATCH', options);
}

export async function proxyDeleteJson(
  request: NextRequest,
  path: string,
  options: { requireOrg?: boolean; headers?: Record<string, string> } = {},
): Promise<NextResponse> {
  return proxyJsonWithBody(request, path, 'DELETE', options);
}
