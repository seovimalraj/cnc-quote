import { Suspense } from 'react';
import QuoteClient from './QuoteClient';

export default function QuotePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuoteClient />
    </Suspense>
  );
}
