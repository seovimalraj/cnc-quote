'use client';
/**
 * @module UseAdminQuoteDetail
 * @ownership web/admin
 * @purpose Merge admin quote detail and quote summary fetches into a single React Query powered hook.
 */

import { useQuery } from '@tanstack/react-query';

import {
  fetchAdminQuoteDetail,
  fetchQuoteSummaryVNext,
  type AdminQuoteDetailResponse,
  type QuoteSummaryVNext,
} from '@/lib/admin/api';

export type UseAdminQuoteDetailResult = {
  detail?: AdminQuoteDetailResponse;
  summary?: QuoteSummaryVNext;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAdminQuoteDetail(quoteId: string): UseAdminQuoteDetailResult {
  const detailQuery = useQuery<AdminQuoteDetailResponse>({
    queryKey: ['admin-quote-detail', quoteId],
    queryFn: () => fetchAdminQuoteDetail(quoteId),
    enabled: Boolean(quoteId),
    retry: 1,
    networkMode: 'online',
  });

  const summaryQuery = useQuery<QuoteSummaryVNext>({
    queryKey: ['admin-quote-summary', quoteId],
    queryFn: () => fetchQuoteSummaryVNext(quoteId),
    enabled: Boolean(quoteId),
    retry: 1,
    networkMode: 'online',
  });

  let error: Error | null = null;
  if (detailQuery.error instanceof Error) {
    error = detailQuery.error;
  } else if (summaryQuery.error instanceof Error) {
    error = summaryQuery.error;
  } else if (detailQuery.error || summaryQuery.error) {
    error = new Error('Request failed');
  }

  const isLoading = detailQuery.isLoading || summaryQuery.isLoading;
  const isFetching = detailQuery.isFetching || summaryQuery.isFetching;

  return {
    detail: detailQuery.data,
    summary: summaryQuery.data,
    isLoading,
    isFetching,
    isError: Boolean(error),
    error,
    refetch: () => {
      void detailQuery.refetch();
      void summaryQuery.refetch();
    },
  };
}
