/**
 * Step 13: Unit Tests for Optimistic Pricing
 * Tests for estimation logic, cache keys, and rollback decisions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  optimisticEstimate,
  annotate,
  shouldRollback,
  mergeServerResponse,
  estimateConfidence,
} from '@/lib/pricing/optimistic';
import { toStableKey } from '@/lib/pricing/queryKeys';
import { pricingHash, requestsEqual } from '@/lib/pricing/hash';
import type { PricingRequest, PricingResponse, AnnotatedPricingResponse } from '@/lib/pricing/types';

// Helper to create mock request
function mockRequest(overrides?: Partial<PricingRequest>): PricingRequest {
  return {
    process: 'cnc_milling',
    material_code: 'AL6061',
    quantity: 1,
    lead_class: 'std',
    part_digest: 'test-digest-123',
    catalog_version: 'v1',
    ...overrides,
  };
}

// Helper to create mock response
function mockResponse(overrides?: Partial<AnnotatedPricingResponse>): AnnotatedPricingResponse {
  return {
    subtotal: 100,
    tax: 18,
    total: 118,
    lead_days: 7,
    breakdown: [],
    pricing_hash: 'abc123',
    version: 'v1',
    from_cache: false,
    __qty: 1,
    __mat: 'AL6061',
    __proc: 'cnc_milling',
    __lead: 'std',
    ...overrides,
  };
}

describe('optimisticEstimate', () => {
  it('returns undefined when no previous data', () => {
    const request = mockRequest({ quantity: 5 });
    const estimate = optimisticEstimate(undefined, request);
    
    expect(estimate).toBeUndefined();
  });

  it('scales price by quantity with diminishing returns', () => {
    const prev = mockResponse({ total: 100, subtotal: 84.75, tax: 15.25, __qty: 1 });
    const next = mockRequest({ quantity: 5 });
    
    const estimate = optimisticEstimate(prev, next);
    
    // Formula: price_per_unit = base * qty^(-0.25)
    // 5^(-0.25) ≈ 0.6687
    // But total price scales differently
    expect(estimate).toBeDefined();
    expect(estimate!.total).toBeGreaterThan(100); // Should increase
    expect(estimate!.total).toBeLessThan(500); // But not linearly
  });

  it('adjusts for material changes', () => {
    const prev = mockResponse({ total: 100, __mat: 'AL6061' });
    const nextToSS = mockRequest({ material_code: 'SS304' });
    
    const estimate = optimisticEstimate(prev, nextToSS);
    
    expect(estimate!.total).toBeGreaterThan(100); // SS is more expensive
  });

  it('applies lead class multipliers', () => {
    const prev = mockResponse({ total: 100, __lead: 'std' });
    
    const econEstimate = optimisticEstimate(prev, mockRequest({ lead_class: 'econ' }));
    const expressEstimate = optimisticEstimate(prev, mockRequest({ lead_class: 'express' }));
    
    expect(econEstimate!.total).toBeLessThan(100); // -4% discount
    expect(expressEstimate!.total).toBeGreaterThan(100); // +12% surge
  });

  it('marks estimate as optimistic', () => {
    const prev = mockResponse({ total: 100 });
    const estimate = optimisticEstimate(prev, mockRequest({ quantity: 2 }));
    
    expect(estimate!.pricing_hash).toBe('optimistic');
  });

  it('preserves tax rate proportionally', () => {
    const prev = mockResponse({ subtotal: 100, tax: 18, total: 118 });
    const estimate = optimisticEstimate(prev, mockRequest({ quantity: 2 }));
    
    const originalTaxRate = 18 / 100;
    const estimatedTaxRate = estimate!.tax / estimate!.subtotal;
    
    expect(estimatedTaxRate).toBeCloseTo(originalTaxRate, 2);
  });
});

describe('annotate', () => {
  it('extracts request parameters for tracking', () => {
    const request = mockRequest({
      quantity: 5,
      material_code: 'SS304',
      process: 'turning',
      lead_class: 'express',
    });
    
    const annotations = annotate(request);
    
    expect(annotations).toEqual({
      __qty: 5,
      __mat: 'SS304',
      __proc: 'turning',
      __lead: 'express',
    });
  });
});

describe('shouldRollback', () => {
  it('returns false when server matches optimistic within threshold', () => {
    const server = mockResponse({ total: 100 });
    const optimistic = mockResponse({ total: 105 }); // 5% difference
    
    expect(shouldRollback(server, optimistic)).toBe(false);
  });

  it('returns true when server differs by >15%', () => {
    const server = mockResponse({ total: 100 });
    const optimistic = mockResponse({ total: 120 }); // 20% difference
    
    expect(shouldRollback(server, optimistic)).toBe(true);
  });

  it('handles zero prices', () => {
    const server = mockResponse({ total: 1 });
    const optimistic = mockResponse({ total: 0 });
    
    // Should not throw
    const result = shouldRollback(server, optimistic);
    expect(typeof result).toBe('boolean');
  });
});

describe('mergeServerResponse', () => {
  it('combines server data with request annotations', () => {
    const server: PricingResponse = {
      subtotal: 100,
      tax: 18,
      total: 118,
      lead_days: 7,
      breakdown: [],
      pricing_hash: 'server-hash',
      version: 'v1',
    };
    
    const request = mockRequest({ quantity: 5, material_code: 'SS304' });
    
    const merged = mergeServerResponse(server, request);
    
    expect(merged.total).toBe(118);
    expect(merged.pricing_hash).toBe('server-hash');
    expect(merged.__qty).toBe(5);
    expect(merged.__mat).toBe('SS304');
  });
});

describe('estimateConfidence', () => {
  it('returns 0 when no previous data', () => {
    const confidence = estimateConfidence(undefined, mockRequest());
    expect(confidence).toBe(0);
  });

  it('returns 1.0 for identical requests', () => {
    const prev = mockResponse({ __qty: 5, __mat: 'AL6061', __proc: 'cnc_milling' });
    const next = mockRequest({ quantity: 5, material_code: 'AL6061', process: 'cnc_milling' });
    
    const confidence = estimateConfidence(prev, next);
    expect(confidence).toBe(1.0);
  });

  it('reduces confidence for material changes', () => {
    const prev = mockResponse({ __mat: 'AL6061' });
    const next = mockRequest({ material_code: 'SS304' });
    
    const confidence = estimateConfidence(prev, next);
    expect(confidence).toBeLessThan(1.0);
  });

  it('reduces confidence for large quantity jumps', () => {
    const prev = mockResponse({ __qty: 1 });
    const next = mockRequest({ quantity: 10 });
    
    const confidence = estimateConfidence(prev, next);
    expect(confidence).toBeLessThan(1.0);
  });
});

describe('toStableKey', () => {
  it('generates same key for identical requests', () => {
    const req1 = mockRequest({ quantity: 5, material_code: 'AL6061' });
    const req2 = mockRequest({ quantity: 5, material_code: 'AL6061' });
    
    const key1 = toStableKey(req1);
    const key2 = toStableKey(req2);
    
    expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
  });

  it('sorts finishes array for stability', () => {
    const req1 = mockRequest({ finishes: ['anodize', 'bead-blast'] });
    const req2 = mockRequest({ finishes: ['bead-blast', 'anodize'] });
    
    const key1 = toStableKey(req1);
    const key2 = toStableKey(req2);
    
    expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
  });

  it('sorts tolerances object keys for stability', () => {
    const req1 = mockRequest({
      tolerances: {
        feature_a: { type: '+/-', value: 0.1 },
        feature_b: { type: '+/-', value: 0.2 },
      },
    });
    
    const req2 = mockRequest({
      tolerances: {
        feature_b: { type: '+/-', value: 0.2 },
        feature_a: { type: '+/-', value: 0.1 },
      },
    });
    
    const key1 = toStableKey(req1);
    const key2 = toStableKey(req2);
    
    expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
  });
});

describe('pricingHash', () => {
  it('generates deterministic hash', () => {
    const request = mockRequest();
    
    const hash1 = pricingHash(request);
    const hash2 = pricingHash(request);
    
    expect(hash1).toBe(hash2);
  });

  it('generates different hashes for different requests', () => {
    const req1 = mockRequest({ quantity: 1 });
    const req2 = mockRequest({ quantity: 2 });
    
    const hash1 = pricingHash(req1);
    const hash2 = pricingHash(req2);
    
    expect(hash1).not.toBe(hash2);
  });

  it('normalizes array order', () => {
    const req1 = mockRequest({ finishes: ['a', 'b'] });
    const req2 = mockRequest({ finishes: ['b', 'a'] });
    
    const hash1 = pricingHash(req1);
    const hash2 = pricingHash(req2);
    
    expect(hash1).toBe(hash2);
  });
});

describe('requestsEqual', () => {
  it('returns true for identical requests', () => {
    const req1 = mockRequest();
    const req2 = mockRequest();
    
    expect(requestsEqual(req1, req2)).toBe(true);
  });

  it('returns false for different requests', () => {
    const req1 = mockRequest({ quantity: 1 });
    const req2 = mockRequest({ quantity: 2 });
    
    expect(requestsEqual(req1, req2)).toBe(false);
  });
});
