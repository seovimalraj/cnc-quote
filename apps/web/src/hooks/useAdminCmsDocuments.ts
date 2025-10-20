'use client';

import { useQuery } from '@tanstack/react-query';
import { ContractsV1 } from '@cnc-quote/shared';

import { fetchAdminDocuments } from '@/lib/admin/api';

export type UseAdminCmsDocumentsResult = {
  documents: ContractsV1.AdminCmsDocumentV1[];
  fetchedAt?: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAdminCmsDocuments(): UseAdminCmsDocumentsResult {
  const query = useQuery({
    queryKey: ['admin', 'cms', 'documents'],
    queryFn: fetchAdminDocuments,
    refetchInterval: 180_000,
    staleTime: 90_000,
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
    documents: query.data?.documents ?? [],
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
