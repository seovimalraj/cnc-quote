'use client';

import { useState } from 'react';
import { usePrice } from '@/lib/pricing/usePrice';
import ConfigToggles from '@/components/pricing/ConfigToggles';
import PriceBox from '@/components/pricing/PriceBox';
import { pricingHash } from '@/lib/pricing/hash';
import type { PricingRequest } from '@/lib/pricing/types';

export default function PricingDemoPage() {
  const [request, setRequest] = useState<PricingRequest>({
    process: 'cnc_milling',
    material_code: 'AL6061',
    quantity: 1,
    lead_class: 'std',
    part_digest: 'demo-part-digest-abc123',
    catalog_version: 'v1',
  });

  const { data, isPending, isFetching, error, updatePrice } = usePrice(request);

  function handleChange(nextRequest: PricingRequest) {
    setRequest(nextRequest);
    updatePrice(nextRequest); // Optimistic + reconcile
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Optimistic UI Pricing Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Change configuration to see instant price updates with server validation
        </p>
      </div>

      <div className="grid gap-8">
        {/* Configuration Controls */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Configuration
          </h2>
          <ConfigToggles
            value={request}
            onChange={handleChange}
            disabled={false}
          />
        </div>

        {/* Price Display */}
        <PriceBox
          data={data}
          isPending={isPending}
          isFetching={isFetching}
          error={error}
        />

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-800 dark:text-gray-200">
            <h3 className="font-semibold mb-2">Debug Info</h3>
            <div className="space-y-1">
              <div>Hash: {pricingHash(request)}</div>
              <div>Pending: {isPending ? 'Yes' : 'No'}</div>
              <div>Fetching: {isFetching ? 'Yes' : 'No'}</div>
              <div>
                Optimistic:{' '}
                {data?.pricing_hash === 'optimistic' ? 'Yes' : 'No'}
              </div>
              {data && (
                <>
                  <div>Subtotal: ₹{data.subtotal.toFixed(2)}</div>
                  <div>Tax: ₹{data.tax.toFixed(2)}</div>
                  <div>Total: ₹{data.total.toFixed(2)}</div>
                  <div>Lead Days: {data.lead_days}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
            💡 Try This
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• Change quantity rapidly - notice instant updates</li>
            <li>• Switch materials - see price adjust immediately</li>
            <li>• Toggle lead time - watch surge pricing in action</li>
            <li>• Check the debug info to see optimistic vs final prices</li>
            <li>• Open browser DevTools Network tab to see API calls</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
