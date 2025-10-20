'use client';
/**
 * @module UseAdminReviewDetail
 * @ownership web/admin
 * @purpose Fetch and cache manual review workspace details using React Query with contract validation.
 */

import { useQuery } from '@tanstack/react-query';

import { fetchReviewDetail, type ReviewDetailResponse } from '@/lib/admin/api';

export type UseAdminReviewDetailResult = {
  detail?: ReviewDetailResponse;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAdminReviewDetail(quoteId: string): UseAdminReviewDetailResult {
  const query = useQuery<ReviewDetailResponse>({
    queryKey: ['admin-review-detail', quoteId],
    queryFn: () => fetchReviewDetail(quoteId),
    enabled: Boolean(quoteId),
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
    detail: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: Boolean(error),
    error,
    refetch: () => {
      void query.refetch();
    },
  };
}
