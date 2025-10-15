'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useSetQueryParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (key: string, value: string | null, options?: { replace?: boolean }) => {
  const next = new URLSearchParams(params?.toString() ?? '');

    if (value === null || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    const query = next.toString();
    const basePath = pathname ?? '/';
    const href = query ? `${basePath}?${query}` : basePath;
    const navigate = options?.replace ? router.replace : router.push;
    navigate(href);
  };
}
