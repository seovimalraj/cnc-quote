'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  InformationCircleIcon,
  CreditCardIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';

export default function CheckoutCancelPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.quote_id as string;

  useEffect(() => {
    // Track page view
    posthog.capture('payment_cancel_view', { quote_id: quoteId });
  }, [quoteId]);

  const handleReturnToPayment = () => {
    router.push(`/portal/checkout/${quoteId}?step=6`);
  };

  const handleBackToQuote = () => {
    router.push(`/portal/quotes/${quoteId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-16">
        <div className="text-center mb-8">
          {/* Info Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <InformationCircleIcon className="h-8 w-8 text-blue-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-lg text-gray-600">
            Your payment was cancelled. No charges have been made to your account.
          </p>
        </div>

        {/* Information Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>What happens next?</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                <p className="text-sm text-gray-700">
                  Your quote remains available and all your selections have been saved.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                <p className="text-sm text-gray-700">
                  You can return to checkout at any time to complete your order.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                <p className="text-sm text-gray-700">
                  Pricing and availability are guaranteed for 30 days from quote creation.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                <p className="text-sm text-gray-700">
                  Need help? Our support team is here to assist you.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Quote Expiration</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your quote is valid for 30 days. After this period, you may need to request a new quote if pricing or availability has changed.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleReturnToPayment}
              className="flex items-center justify-center space-x-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Return to Payment</span>
            </Button>

            <Button
              onClick={handleBackToQuote}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <DocumentTextIcon className="h-4 w-4" />
              <span>Back to Quote</span>
            </Button>
          </div>
        </div>

        {/* Additional Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Payment Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <CreditCardIcon className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Your payment information is secure</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• We use industry-standard encryption for all payment data</li>
                  <li>• Your card details are never stored on our servers</li>
                  <li>• All transactions are processed through secure payment gateways</li>
                  <li>• You can safely return to complete your payment at any time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Questions about your quote or need assistance?</p>
          <p className="mt-1">
            Contact our support team at{' '}
            <a href="mailto:support@cnc-quote.com" className="text-blue-600 hover:text-blue-800">
              support@cnc-quote.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
