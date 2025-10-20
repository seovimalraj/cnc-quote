'use client';
/**
 * @module UseAdminQuotesList
 * @ownership web/admin
 * @purpose Synchronize admin quote list results with the URL search params while enforcing vNext contracts.
 */

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchAdminQuotesList,
  normalizeReviewListParams,
  type AdminQuotesListResponse,
} from '@/lib/admin/api';
import type { ReviewListQuery } from '@/lib/admin/validation';

function paramsFromSearch(
  sp: ReadonlyURLSearchParams | URLSearchParams | null | undefined,
): Record<string, unknown> {
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

export type UseAdminQuotesListResult = {
  data: AdminQuotesListResponse['data'];
  stats?: AdminQuotesListResponse['stats'];
  filters: ReviewListQuery;
  queryKey: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

export function useAdminQuotesList(): UseAdminQuotesListResult {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString() ?? '';

  const normalized = useMemo(() => {
    const raw = paramsFromSearch(new URLSearchParams(searchParamsKey));
    return normalizeReviewListParams(raw);
  }, [searchParamsKey]);

  const baseParamsKey = useMemo(() => {
    const params = new URLSearchParams(normalized.searchParams);
    params.delete('cursor');
    return params.toString();
  }, [normalized.searchParams]);

  const query = useInfiniteQuery<AdminQuotesListResponse>({
    queryKey: ['admin-quotes', baseParamsKey],
    queryFn: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : undefined;
      const payload: ReviewListQuery = {
        ...normalized.parsed,
        cursor,
      };
      return fetchAdminQuotesList(payload);
    },
    initialPageParam: normalized.parsed.cursor,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
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

  const pages = query.data?.pages ?? [];
  const combined = pages.flatMap((page) => page.data);
  const stats = pages.length > 0 ? pages[0].stats : undefined;
  const hasNextPage = Boolean(query.hasNextPage);

  return {
    data: combined,
    stats,
    filters: normalized.parsed,
    queryKey: baseParamsKey,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: Boolean(query.error),
    error,
    hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    refetch: () => {
      void query.refetch();
    },
  };
}
