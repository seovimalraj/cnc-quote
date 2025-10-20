'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminDashboardStats, type AdminDashboardStatsResponse } from '@/lib/admin/api';

export type UseAdminDashboardStatsResult = {
  data?: AdminDashboardStatsResponse;
  period: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAdminDashboardStats(period = '30d'): UseAdminDashboardStatsResult {
  const query = useQuery<AdminDashboardStatsResponse>({
    queryKey: ['admin-dashboard-stats', period],
    queryFn: () => fetchAdminDashboardStats(period),
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
    data: query.data,
    period,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: Boolean(query.error),
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
