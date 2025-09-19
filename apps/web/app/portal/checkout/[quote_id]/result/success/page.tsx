'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { trackEvent } from '@/lib/analytics/posthog';

interface Order {
  id: string;
  quote_id: string;
  status: string;
  estimated_ship_date: string;
  total_amount: number;
  created_at: string;
}

export default function CheckoutSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.quote_id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock order data
  const mockOrder: Order = {
    id: 'ORD-2024-00123',
    quote_id: quoteId,
    status: 'confirmed',
    estimated_ship_date: '2024-10-15',
    total_amount: 2875.00,
    created_at: new Date().toISOString(),
  };

  useEffect(() => {
    // Track page view
    trackEvent('payment_success_view', { quote_id: quoteId });

    // Simulate API call to fetch order
    const fetchOrder = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrder(mockOrder);
      setLoading(false);
    };

    fetchOrder();
  }, [quoteId]);

  const handleViewOrder = () => {
    router.push(`/portal/orders/${order?.id}`);
  };

  const handleDownloadInvoice = async () => {
    // In real implementation: trigger download with signed URL
    const link = document.createElement('a');
    link.href = `/api/orders/${order?.id}/invoice.pdf`;
    link.download = `invoice-${order?.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackToDashboard = () => {
    router.push('/portal/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-16 w-16 bg-green-200 rounded-full mx-auto mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600">We couldn't find your order details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-16">
        <div className="text-center mb-8">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-lg text-gray-600">
            Your order has been confirmed and manufacturing will begin shortly.
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>Order Confirmation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Order ID:</span>
                <div className="font-semibold text-lg">{order.id}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div className="mt-1">
                  <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Paid:</span>
                <div className="font-semibold">${order.total_amount.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Estimated Ship Date:</span>
                <div className="font-semibold">
                  {new Date(order.estimated_ship_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 text-blue-600 mt-0.5">ℹ️</div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">What's Next?</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Manufacturing will begin within 1-2 business days</li>
                      <li>• You'll receive email updates on production progress</li>
                      <li>• Quality inspection photos will be available in your portal</li>
                      <li>• Shipping confirmation will be sent when your order ships</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleViewOrder}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <EyeIcon className="h-4 w-4" />
              <span>View Order</span>
            </Button>

            <Button
              onClick={handleDownloadInvoice}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Download Invoice</span>
            </Button>

            <Button
              onClick={handleBackToDashboard}
              className="flex items-center justify-center space-x-2"
            >
              <HomeIcon className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>

          {/* Additional Actions */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@cnc-quote.com" className="text-blue-600 hover:text-blue-800">
                support@cnc-quote.com
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Thank you for choosing our manufacturing services!</p>
          <p className="mt-1">We appreciate your business and look forward to delivering your parts.</p>
        </div>
      </div>
    </div>
  );
}
