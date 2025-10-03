import { Suspense } from 'react';
import XometryStyleQuotePage from '@/components/XometryStyleQuotePage';

export default function QuotePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <XometryStyleQuotePage />
    </Suspense>
  );
}
