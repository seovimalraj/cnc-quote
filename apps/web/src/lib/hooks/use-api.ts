import useSWR from 'swr';

export function useApi<T = unknown>(path: string) {
  const { data, error, mutate } = useSWR<T>(path ? `/api${path}` : null);

  return {
    data,
    error,
    isLoading: !error && !data,
    mutate,
  };
}
