'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchReviewList, normalizeReviewListParams } from '@/lib/admin/api';
import type { ReviewListResponse } from '@/lib/admin/types';
import type { ReviewListQuery } from '@/lib/admin/validation';

function paramsFromSearch(sp: ReadonlyURLSearchParams | URLSearchParams | null | undefined): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  if (!sp) {
    return raw;
  }

  sp.forEach((value, key) => {
    const current = raw[key];

    if (current === undefined) {
      raw[key] = value;
      return;
    }

    if (Array.isArray(current)) {
      raw[key] = [...current, value];
      return;
    }

    raw[key] = [current, value];
  });

  return raw;
}

export type UseAdminReviewQueueResult = {
  data: ReviewListResponse['data'];
  stats?: ReviewListResponse['stats'];
  meta?: ReviewListResponse['meta'];
  filters: ReviewListQuery;
  queryKey: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAdminReviewQueue(): UseAdminReviewQueueResult {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString() ?? '';

  const normalized = useMemo(() => {
    const raw = paramsFromSearch(new URLSearchParams(searchParamsKey));
    return normalizeReviewListParams(raw);
  }, [searchParamsKey]);

  const query = useQuery<ReviewListResponse>({
    queryKey: ['admin-review', normalized.cacheKey],
    queryFn: () => fetchReviewList(normalized.parsed),
    placeholderData: (previous) => previous,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
    networkMode: 'online',
  });

  let error: Error | null = null;
  if (query.error instanceof Error) {
    error = query.error;
  } else if (query.error) {
    error = new Error('Request failed');
  }

  return {
    data: query.data?.data ?? [],
    stats: query.data?.stats,
    meta: query.data?.meta,
    filters: normalized.parsed,
    queryKey: normalized.cacheKey,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: Boolean(query.error),
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
