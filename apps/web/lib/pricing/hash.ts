/**
 * Step 13: Client-side Pricing Hash
 * Deterministic hash generation mirroring server-side logic
 */

import { PricingRequest } from './types';

/**
 * Simple hash function (FNV-1a variant)
 * Provides deterministic hashing without external dependencies
 */
function simpleHash(str: string): string {
  let hash = 2166136261; // FNV offset basis
  
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  
  // Convert to unsigned 32-bit and format as hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generates a deterministic pricing hash from a request
 * Used for cache validation and telemetry
 */
export function pricingHash(req: PricingRequest): string {
  // Create a normalized representation
  const normalized = {
    p: req.process,
    m: req.material_code,
    q: req.quantity,
    l: req.lead_class,
    t: req.tolerances || null,
    f: req.finishes ? [...req.finishes].sort() : null,
    d: req.part_digest,
    c: req.catalog_version,
  };

  const jsonStr = JSON.stringify(normalized);
  return simpleHash(jsonStr);
}

/**
 * Compare two requests for equivalence
 */
export function requestsEqual(a: PricingRequest, b: PricingRequest): boolean {
  return pricingHash(a) === pricingHash(b);
}
