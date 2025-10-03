/**
 * Step 13: Optimistic Pricing Engine
 * Client-side price estimation and reconciliation logic
 */

import {
  PricingRequest,
  PricingResponse,
  AnnotatedPricingResponse,
  LeadClass,
} from './types';

/**
 * Material complexity multipliers (naive heuristics)
 * In production, these would come from a material catalog
 */
const MATERIAL_MULTIPLIERS: Record<string, number> = {
  AL6061: 1.0, // Baseline aluminum
  SS304: 1.15, // Stainless slightly more expensive
  SS316: 1.20,
  BRASS: 1.10,
  COPPER: 1.25,
  TITANIUM: 2.50,
  ABS: 0.85, // Plastics generally cheaper
  PLA: 0.80,
  NYLON: 0.95,
};

/**
 * Process complexity multipliers
 */
const PROCESS_MULTIPLIERS: Record<string, number> = {
  cnc_milling: 1.0, // Baseline
  turning: 0.90, // Generally faster
  sheet: 0.85, // Faster setup
  im: 0.70, // Injection molding economies
};

/**
 * Lead time class multipliers
 */
const LEAD_CLASS_MULTIPLIERS: Record<LeadClass, number> = {
  econ: 0.96, // 4% discount for economy
  std: 1.0, // Baseline
  express: 1.12, // 12% surge for express
};

/**
 * Generate optimistic price estimate based on previous response
 * Uses heuristic scaling factors for instant feedback
 */
export function optimisticEstimate(
  prev: AnnotatedPricingResponse | undefined,
  nextReq: PricingRequest
): AnnotatedPricingResponse | undefined {
  if (!prev) {
    return undefined; // No baseline to estimate from
  }

  // Extract previous request parameters from annotations
  const prevQty = prev.__qty || 1;
  const prevMat = prev.__mat || '';
  const prevProc = prev.__proc || '';
  const prevLead = prev.__lead || 'std';

  // Quantity scaling with diminishing returns (economies of scale)
  // Formula: price_per_unit = base * qty^(-0.25)
  const qtyRatio = nextReq.quantity / Math.max(1, prevQty);
  const qtyFactor = Math.max(0.6, Math.min(1.4, Math.pow(qtyRatio, -0.25)));

  // Material adjustment
  const prevMatMultiplier = MATERIAL_MULTIPLIERS[prevMat] || 1.08;
  const nextMatMultiplier = MATERIAL_MULTIPLIERS[nextReq.material_code] || 1.08;
  const materialFactor = nextReq.material_code === prevMat 
    ? 1.0 
    : nextMatMultiplier / prevMatMultiplier;

  // Process adjustment
  const prevProcMultiplier = PROCESS_MULTIPLIERS[prevProc] || 1.05;
  const nextProcMultiplier = PROCESS_MULTIPLIERS[nextReq.process] || 1.05;
  const processFactor = nextReq.process === prevProc
    ? 1.0
    : nextProcMultiplier / prevProcMultiplier;

  // Lead time adjustment
  const prevLeadMultiplier = LEAD_CLASS_MULTIPLIERS[prevLead];
  const nextLeadMultiplier = LEAD_CLASS_MULTIPLIERS[nextReq.lead_class];
  const leadFactor = nextLeadMultiplier / prevLeadMultiplier;

  // Combined scaling
  const totalScale = qtyFactor * materialFactor * processFactor * leadFactor;

  // Apply scaling to subtotal
  const subtotal = Math.max(0, prev.subtotal * totalScale);
  
  // Scale tax proportionally
  const taxRate = prev.tax / Math.max(1, prev.subtotal);
  const tax = subtotal * taxRate;
  
  const total = subtotal + tax;

  // Estimate lead days (very rough)
  const leadDays = {
    econ: 10,
    std: 7,
    express: 3,
  }[nextReq.lead_class];

  return {
    ...prev,
    subtotal,
    tax,
    total,
    lead_days: leadDays,
    from_cache: true,
    pricing_hash: 'optimistic', // Special marker for optimistic values
    ...annotate(nextReq),
  };
}

/**
 * Annotate pricing response with request parameters
 * Used to track what request generated this response
 */
export function annotate(req: PricingRequest): Partial<AnnotatedPricingResponse> {
  return {
    __qty: req.quantity,
    __mat: req.material_code,
    __proc: req.process,
    __lead: req.lead_class,
  };
}

/**
 * Determine if we should rollback optimistic value when server responds
 * Rollback if deviation is too large (indicates optimistic math was wrong)
 */
export function shouldRollback(
  server: PricingResponse,
  optimistic: PricingResponse
): boolean {
  const delta = Math.abs(server.total - optimistic.total);
  const relativeDelta = delta / Math.max(1, server.total);
  
  // Rollback if more than 15% off
  const threshold = 0.15;
  
  if (relativeDelta > threshold) {
    console.warn(
      `Optimistic rollback triggered: ${(relativeDelta * 100).toFixed(1)}% deviation`,
      { server: server.total, optimistic: optimistic.total }
    );
    return true;
  }
  
  return false;
}

/**
 * Merge server response with optimistic annotations
 * Preserves tracking data for next optimistic calculation
 */
export function mergeServerResponse(
  server: PricingResponse,
  req: PricingRequest
): AnnotatedPricingResponse {
  return {
    ...server,
    ...annotate(req),
  };
}

/**
 * Calculate confidence score for optimistic estimate
 * Higher score means more reliable estimate
 */
export function estimateConfidence(
  prev: AnnotatedPricingResponse | undefined,
  nextReq: PricingRequest
): number {
  if (!prev) return 0;

  let confidence = 1.0;

  // Reduce confidence for material changes
  if (nextReq.material_code !== prev.__mat) {
    confidence *= 0.7;
  }

  // Reduce confidence for process changes
  if (nextReq.process !== prev.__proc) {
    confidence *= 0.8;
  }

  // Large quantity changes reduce confidence
  const qtyRatio = nextReq.quantity / Math.max(1, prev.__qty || 1);
  if (qtyRatio > 2 || qtyRatio < 0.5) {
    confidence *= 0.85;
  }

  return confidence;
}
