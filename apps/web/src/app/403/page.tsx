'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics/posthog';

export default function ForbiddenPage() {
  const router = useRouter();

  useEffect(() => {
    // Track 403 page view
    trackEvent('page_403_view', {
      referrer: document.referrer,
      user_agent: navigator.userAgent
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <div className="text-4xl">🚫</div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Access Forbidden</h2>

          <p className="text-gray-600 mb-8">
            You don't have permission to access this resource.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/portal/dashboard')}
              className="w-full flex items-center justify-center space-x-2"
            >
              <span>🏠</span>
              <span>Go to Dashboard</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full flex items-center justify-center space-x-2"
            >
              <span>⬅️</span>
              <span>Go Back</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => router.push('/help')}
              className="w-full"
            >
              Visit Help Center
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please{' '}
              <button
                onClick={() => router.push('/help/contact')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                contact support
              </button>
              {' '}with details about what you were trying to access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
