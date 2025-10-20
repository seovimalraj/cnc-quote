'use client';

import { useQuery } from '@tanstack/react-query';
import { ContractsV1 } from '@cnc-quote/shared';

import { fetchAdminPages } from '@/lib/admin/api';

export type UseAdminCmsPagesResult = {
  pages: ContractsV1.AdminCmsPageV1[];
  fetchedAt?: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAdminCmsPages(): UseAdminCmsPagesResult {
  const query = useQuery({
    queryKey: ['admin', 'cms', 'pages'],
    queryFn: fetchAdminPages,
    refetchInterval: 120_000,
    staleTime: 60_000,
    gcTime: 600_000,
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
    pages: query.data?.pages ?? [],
    fetchedAt: query.data?.fetched_at,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: Boolean(query.error),
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
