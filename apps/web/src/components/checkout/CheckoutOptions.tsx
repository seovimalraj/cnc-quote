import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PayPalCheckout } from './PayPalCheckout';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CheckoutOptionsProps {
  quoteId: string;
  amount: number;
  currency: string;
}

export function CheckoutOptions({ quoteId, amount, currency }: CheckoutOptionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStripeCheckout = async () => {
    try {
      setIsLoading(true);
      const response = await api.post('/payments/create-checkout-session', {
        quoteId,
        provider: 'stripe',
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to start checkout process');
      console.error('Stripe checkout error:', error);
      setIsLoading(false);
    }
  };

  const handlePayPalSuccess = (orderId: string) => {
    router.push(`/portal/orders/${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Choose Payment Method</h2>
        
        <div className="space-y-4">
          {/* Stripe Checkout Button */}
          <button
            onClick={handleStripeCheckout}
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pay with Card (Stripe)
          </button>

          {/* PayPal Checkout Button */}
          <div className="mt-4">
            <PayPalCheckout
              quoteId={quoteId}
              amount={amount.toString()}
              currency={currency}
              isLoading={isLoading}
              onSuccess={handlePayPalSuccess}
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>By proceeding with the payment, you agree to our terms of service.</p>
        </div>
      </div>
    </div>
  );
}
