/**
 * Step 13: Query Key Factory
 * Generates stable, composable cache keys for React Query
 */

import { PricingRequest } from './types';

export const PRICING_QUERY_KEY = 'pricing' as const;

/**
 * Generates a stable query key from a pricing request
 * Normalizes array/object order to ensure identical configs produce identical keys
 */
export function toStableKey(req: PricingRequest) {
  // Sort finishes array for stability
  const sortedFinishes = req.finishes ? [...req.finishes].sort() : undefined;
  
  // Sort tolerances object keys for stability
  const sortedTolerances = req.tolerances
    ? Object.keys(req.tolerances)
        .sort()
        .reduce((acc, key) => {
          acc[key] = req.tolerances![key];
          return acc;
        }, {} as Record<string, any>)
    : undefined;

  const normalized = {
    process: req.process,
    material_code: req.material_code,
    quantity: req.quantity,
    lead_class: req.lead_class,
    finishes: sortedFinishes,
    tolerances: sortedTolerances,
    part_digest: req.part_digest,
    catalog_version: req.catalog_version,
  };

  return [PRICING_QUERY_KEY, normalized] as const;
}

export type PricingKey = ReturnType<typeof toStableKey>;

/**
 * Invalidate all pricing queries
 */
export function getAllPricingKeys() {
  return [PRICING_QUERY_KEY];
}

/**
 * Invalidate pricing queries for a specific version
 */
export function getPricingKeysByVersion(version: string) {
  return [PRICING_QUERY_KEY, { version }];
}
