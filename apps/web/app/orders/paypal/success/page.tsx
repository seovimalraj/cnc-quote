'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PayPalSuccessPage() {
  return (
    <Suspense fallback={<PendingState />}>
      <PayPalSuccessContent />
    </Suspense>
  );
}

function PayPalSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params?.get('token'); // PayPal returns token parameter for order approval
  const [status, setStatus] = useState<'capturing' | 'succeeded' | 'error'>('capturing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const capture = async () => {
      if (!orderId) {
        setStatus('error');
        setError('Missing PayPal order token');
        return;
      }
      try {
        const resp = await fetch(`/api/payments/paypal/capture?orderId=${orderId}`, { method: 'POST' });
        if (!resp.ok) {
          const msg = await resp.text();
          setError(msg || 'Capture failed');
          setStatus('error');
          return;
        }
        setStatus('succeeded');
      } catch (e: any) {
        setError(e.message);
        setStatus('error');
      }
    };
    capture();
  }, [orderId]);

  if (status === 'capturing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin h-10 w-10 border-2 border-b-transparent rounded-full" />
        <p>Finalizing your payment...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 font-medium">Payment failed: {error}</p>
        <Button onClick={() => router.push('/portal/quotes')}>Back to Quotes</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold text-green-600">Payment Successful</h1>
      <p>Your order has been created. You can now view it in your orders list.</p>
      <div className="flex gap-4">
        <Button onClick={() => router.push('/portal/orders')}>View Orders</Button>
        <Button variant="outline" onClick={() => router.push('/portal/quotes')}>Back to Quotes</Button>
      </div>
    </div>
  );
}

function PendingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="animate-spin h-10 w-10 border-2 border-b-transparent rounded-full" />
      <p>Finalizing your payment...</p>
    </div>
  );
}
