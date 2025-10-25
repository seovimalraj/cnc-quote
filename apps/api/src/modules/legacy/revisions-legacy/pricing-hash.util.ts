/**
 * Step 16: Pricing Hash Utility
 * Generates deterministic hash for pricing inputs
 */

import * as crypto from 'crypto';

/**
 * Generate a deterministic hash from pricing-relevant fields
 * Used to detect meaningful changes that warrant a new revision
 */
export function generatePricingHash(snapshot: any): string {
  const relevantFields = {
    process: snapshot?.quote?.config?.process,
    material: snapshot?.quote?.config?.material,
    quantity: snapshot?.quote?.config?.quantity,
    tolerances: snapshot?.quote?.config?.tolerances,
    finishes: snapshot?.quote?.config?.finishes,
    region: snapshot?.quote?.config?.region,
    lead_time_class: snapshot?.quote?.header?.lead_time_class,
    lines: snapshot?.quote?.lines?.map((line: any) => ({
      part_id: line.part_id,
      inputs: line.inputs,
    })),
  };

  // Canonicalize by sorting keys
  const canonical = JSON.stringify(relevantFields, Object.keys(relevantFields).sort());
  
  // Generate SHA-256 hash
  return crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex')
    .substring(0, 16);
}
