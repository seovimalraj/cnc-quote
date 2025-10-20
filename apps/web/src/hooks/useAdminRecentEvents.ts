'use client';

import { useQuery } from '@tanstack/react-query';
import { ContractsV1 } from '@cnc-quote/shared';

import { fetchAdminRecentEvents } from '@/lib/admin/api';

export type UseAdminRecentEventsResult = {
  events: ContractsV1.AdminRecentEventV1[];
  fetchedAt?: string;
  limit: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAdminRecentEvents(limit = 10): UseAdminRecentEventsResult {
  const query = useQuery({
    queryKey: ['admin', 'recent-events', limit],
    queryFn: () => fetchAdminRecentEvents(limit),
    refetchInterval: 60_000,
    staleTime: 30_000,
    gcTime: 300_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  let error: Error | null = null;
  if (query.error instanceof Error) {
    error = query.error;
  } else if (query.error) {
    error = new Error('Request failed');
  }

  return {
    events: query.data?.events ?? [],
    fetchedAt: query.data?.fetched_at,
    limit,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: Boolean(query.error),
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
