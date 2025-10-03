/**
 * Step 13: Price Display Component
 * Shows price with skeleton/shimmer states and optimistic indicators
 */

'use client';

import React from 'react';
import { AnnotatedPricingResponse } from '@/lib/pricing/types';

export interface PriceBoxProps {
  data?: AnnotatedPricingResponse;
  isPending: boolean;
  isFetching: boolean;
  error?: Error | null;
  className?: string;
}

/**
 * Price display with loading states
 */
export function PriceBox({
  data,
  isPending,
  isFetching,
  error,
  className = '',
}: PriceBoxProps) {
  // Error state
  if (error) {
    return (
      <div
        data-testid="price-error"
        className={`rounded-lg border-2 border-red-300 bg-red-50 dark:bg-red-900/20 p-6 ${className}`}
      >
        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">Unable to calculate price</span>
        </div>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error.message || 'Please try again or contact support.'}
        </p>
      </div>
    );
  }

  // Loading skeleton (cold start, no previous data)
  if (isPending && !data) {
    return (
      <div
        data-testid="price-skeleton"
        className={`rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // No data yet
  if (!data) {
    return (
      <div
        className={`rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      >
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Configure your part to see pricing
        </p>
      </div>
    );
  }

  // Determine if showing optimistic value
  const isOptimistic = data.pricing_hash === 'optimistic';
  
  // Subtle shimmer when fetching real value (warm state)
  const isShimmering = isFetching && !isOptimistic;

  return (
    <div
      data-testid="price-box"
      className={`
        rounded-lg border-2 bg-white dark:bg-gray-800 p-6 transition-all
        ${isOptimistic ? 'border-yellow-300 dark:border-yellow-600' : 'border-gray-200 dark:border-gray-700'}
        ${isShimmering ? 'opacity-90' : ''}
        ${className}
      `}
    >
      {/* Optimistic indicator */}
      {isOptimistic && (
        <div data-testid="optimistic-indicator" className="mb-3 flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
          <svg
            className="w-4 h-4 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>Calculating exact price...</span>
        </div>
      )}

      {/* Shimmer indicator */}
      {isShimmering && (
        <div className="mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
          <div className="w-4 h-4">
            <div className="w-full h-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span>Updating price...</span>
        </div>
      )}

      {/* Price breakdown */}
      <div className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Subtotal
          </span>
          <span className="font-medium">
            ₹{data.subtotal.toFixed(2)}
          </span>
        </div>

        {/* Tax */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Tax</span>
          <span className="font-medium">
            ₹{data.tax.toFixed(2)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Total
          </span>
          <span data-testid="total-price" className="text-2xl font-bold text-gray-900 dark:text-white">
            ₹{data.total.toFixed(2)}
          </span>
        </div>

        {/* Lead time */}
        <div className="pt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Ships in {data.lead_days} business days
            {isOptimistic && ' (estimated)'}
          </span>
        </div>

        {/* Cache indicator (debug) */}
        {process.env.NODE_ENV === 'development' && data.from_cache && (
          <div className="pt-2 text-xs text-gray-400">
            ✓ Cached result
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceBox;
