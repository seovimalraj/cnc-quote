'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SupplierRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/supplier/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );
}
