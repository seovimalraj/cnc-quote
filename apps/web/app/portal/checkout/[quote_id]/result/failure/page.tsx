import { Suspense } from 'react';
import CheckoutFailureClient from './CheckoutFailureClient';

export default function CheckoutFailurePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutFailureClient />
    </Suspense>
  );
}
