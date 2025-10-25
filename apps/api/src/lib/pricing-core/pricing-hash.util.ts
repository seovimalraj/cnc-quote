/**
 * Step 16: Pricing Hash Utility
 * Generate deterministic hash for pricing inputs/outputs
 * Used for idempotency checks and revision fingerprinting
 */

import { createHash } from 'crypto';

/**
 * Generate a deterministic hash from a quote snapshot
 * This hash changes only when pricing-relevant fields change
 */
export function generatePricingHash(snapshot: any): string {
  // Extract only pricing-relevant fields
  const pricingData = extractPricingFields(snapshot);

  // Sort keys recursively for deterministic output
  const sortedData = sortObjectKeys(pricingData);

  // Generate SHA256 hash
  const jsonString = JSON.stringify(sortedData);
  return createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Extract only fields that affect pricing
 * Ignore timestamps, IDs, analytics, etc.
 */
function extractPricingFields(snapshot: any): any {
  if (!snapshot || typeof snapshot !== 'object') {
    return snapshot;
  }

  // Paths to ignore (volatile fields that don't affect pricing)
  const ignorePaths = [
    'updated_at',
    'created_at',
    'trace_id',
    'request_id',
    'observability',
    'analytics',
    'metadata',
    'timestamps',
  ];

  return filterObject(snapshot, ignorePaths);
}

/**
 * Recursively filter out ignored paths
 */
function filterObject(obj: any, ignorePaths: string[]): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => filterObject(item, ignorePaths));
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const filtered: any = {};

  for (const key of Object.keys(obj)) {
    // Skip ignored keys
    if (ignorePaths.includes(key)) {
      continue;
    }

    // Recursively filter nested objects
    filtered[key] = filterObject(obj[key], ignorePaths);
  }

  return filtered;
}

/**
 * Sort object keys recursively for deterministic JSON.stringify
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const sorted: any = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key]);
  }

  return sorted;
}

/**
 * Compare two pricing hashes
 */
export function isPricingHashEqual(hash1: string | null, hash2: string | null): boolean {
  if (!hash1 || !hash2) {
    return false;
  }
  return hash1 === hash2;
}

/**
 * Generate hash from minimal pricing inputs (for cache lookup)
 */
export function generateInputHash(inputs: {
  process: string;
  material: string;
  quantity: number;
  tolerances: any;
  finishes: string[];
  region?: string;
}): string {
  const sorted = sortObjectKeys(inputs);
  const jsonString = JSON.stringify(sorted);
  return createHash('sha256').update(jsonString).digest('hex');
}
