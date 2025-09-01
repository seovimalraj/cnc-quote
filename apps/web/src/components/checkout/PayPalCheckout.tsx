import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { PayPalOrderDetails } from '@/types/api';

interface PayPalCheckoutProps {
  quoteId: string;
  amount: string;
  currency: string;
  isLoading?: boolean;
  onSuccess?: (orderId: string) => void;
}

export function PayPalCheckout({
  quoteId,
  amount: _amount,
  currency: _currency,
  isLoading,
  onSuccess,
}: PayPalCheckoutProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateOrder = async () => {
    try {
      setIsProcessing(true);
      const response = await api.post<{ orderId: string }>('/payments/create-checkout-session', {
        quoteId,
        provider: 'paypal',
      });

      return response.data.orderId;
    } catch (error: Error) {
      toast.error('Failed to create PayPal order');
      throw error;
    }
  };

  const handleApprove = async (data: { orderID: string }) => {
    try {
      setIsProcessing(true);
      const response = await api.post<PayPalOrderDetails>(`/payments/paypal/capture/${data.orderID}`);
      
      if (response.data.status === 'succeeded') {
        toast.success('Payment successful!');
        if (onSuccess) {
          onSuccess(response.data.orderId ?? '');
        } else {
          router.push(`/portal/orders/${response.data.orderId}`);
        }
      }
    } catch (error: Error) {
      toast.error('Payment failed. Please try again.');
      console.error('PayPal capture error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <PayPalButtons
        style={{
          layout: 'horizontal',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
        }}
        createOrder={handleCreateOrder}
        onApprove={handleApprove}
        disabled={isLoading || isProcessing}
      />
    </div>
  );
}
