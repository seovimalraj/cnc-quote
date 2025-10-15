import type { ReviewDetailResponse, ReviewListResponse } from './types';
import { listQueryZ, type ReviewListQuery } from './validation';

const baseInit: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

export type NormalizedReviewListParams = {
  parsed: ReviewListQuery;
  searchParams: URLSearchParams;
  cacheKey: string;
};

export function normalizeReviewListParams(
  raw: ReviewListQuery | Record<string, unknown>,
): NormalizedReviewListParams {
  const parsed = listQueryZ.parse(raw);
  const params = new URLSearchParams();
  const record = parsed as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    const values = normalizeValues(record[key]);
    for (const entry of values) {
      params.append(key, entry);
    }
  }

  return {
    parsed,
    searchParams: params,
    cacheKey: params.toString(),
  };
}

function normalizeValues(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeScalar(entry))
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  const scalar = normalizeScalar(value);
  return scalar ? [scalar] : [];
}

function normalizeScalar(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return Number.isFinite(value) ? String(value) : null;
    case 'string':
      return value.length > 0 ? value : null;
    default:
      return null;
  }
}

async function httpError(res: Response): Promise<never> {
  const text = await res.text().catch(() => '');
  let payload: any;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || res.statusText };
  }

  const error = new Error(payload.error || `HTTP ${res.status}`) as Error & {
    code?: string;
    requestId?: string;
    details?: unknown;
  };

  error.code = payload.code || String(res.status);
  error.requestId = payload.requestId;
  error.details = payload.details;

  throw error;
}

export async function fetchReviewList(
  rawParams: ReviewListQuery | Record<string, unknown>,
): Promise<ReviewListResponse> {
  const { searchParams } = normalizeReviewListParams(rawParams);
  const res = await fetch(`/api/admin/review?${searchParams.toString()}`, baseInit);

  if (!res.ok) {
    await httpError(res);
  }

  return res.json();
}

export async function fetchReviewDetail(quoteId: string): Promise<ReviewDetailResponse> {
  const res = await fetch(`/api/admin/review/${quoteId}`, baseInit);

  if (!res.ok) {
    await httpError(res);
  }

  return res.json();
}

export async function exportReviewCsv(rawParams: ReviewListQuery | Record<string, unknown>): Promise<Blob> {
  const { searchParams } = normalizeReviewListParams(rawParams);
  const res = await fetch(`/api/admin/review/export.csv?${searchParams.toString()}`, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'text/csv',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  return res.blob();
}
