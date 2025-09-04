'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ExclamationTriangleIcon,
  CreditCardIcon,
  ArrowPathIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';

export default function CheckoutFailurePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = params.quote_id as string;

  const [errorReason, setErrorReason] = useState<string>('');

  useEffect(() => {
    // Track page view
    posthog.capture('payment_failure_view', {
      quote_id: quoteId,
      error_reason: searchParams.get('reason') || 'unknown'
    });

    // Get error reason from URL params (masked for security)
    const reason = searchParams.get('reason');
    if (reason) {
      setErrorReason(getMaskedErrorMessage(reason));
    } else {
      setErrorReason('Payment was declined by your bank or card issuer.');
    }
  }, [quoteId, searchParams]);

  const getMaskedErrorMessage = (reason: string) => {
    // In real implementation: map provider error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'card_declined': 'Your card was declined. Please check with your bank or try a different card.',
      'insufficient_funds': 'Insufficient funds available on your card.',
      'expired_card': 'Your card has expired. Please use a different payment method.',
      'incorrect_cvc': 'The security code (CVC) you entered is incorrect.',
      'processing_error': 'There was a problem processing your payment. Please try again.',
      'fraud_detected': 'This transaction was flagged for security reasons. Please contact support.',
    };

    return errorMessages[reason] || 'Payment was declined by your bank or card issuer.';
  };

  const handleTryAgain = () => {
    router.push(`/portal/checkout/${quoteId}?step=6`);
  };

  const handleUseDifferentMethod = () => {
    router.push(`/portal/checkout/${quoteId}?step=6&change_method=true`);
  };

  const handleBackToQuote = () => {
    router.push(`/portal/quotes/${quoteId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-16">
        <div className="text-center mb-8">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-lg text-gray-600">
            We couldn't process your payment. Don't worry - your quote is still available.
          </p>
        </div>

        {/* Error Details Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCardIcon className="h-5 w-5" />
              <span>Payment Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-900">What happened?</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {errorReason}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Common solutions:</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Check that your card details are entered correctly</li>
                <li>• Ensure your card has sufficient funds</li>
                <li>• Verify that your card is not expired</li>
                <li>• Contact your bank if the issue persists</li>
                <li>• Try using a different payment method</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleTryAgain}
              className="flex items-center justify-center space-x-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Try Payment Again</span>
            </Button>

            <Button
              onClick={handleUseDifferentMethod}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>Use Different Method</span>
            </Button>
          </div>

          <Button
            onClick={handleBackToQuote}
            className="w-full flex items-center justify-center space-x-2"
            variant="outline"
          >
            <span>Return to Quote</span>
          </Button>
        </div>

        {/* Support Options */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                <PhoneIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Call Support</div>
                  <div className="text-sm text-gray-600">1-800-QUOTE-01</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Live Chat</div>
                  <div className="text-sm text-gray-600">Available 9 AM - 6 PM EST</div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Email us at{' '}
                <a href="mailto:support@cnc-quote.com" className="text-blue-600 hover:text-blue-800">
                  support@cnc-quote.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Your payment information is secure and was not saved.</p>
          <p className="mt-1">You can safely try again or use a different payment method.</p>
        </div>
      </div>
    </div>
  );
}
