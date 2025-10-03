/**
 * Step 13: Optimistic UI Pricing Types
 * Runtime-safe type definitions for pricing requests and responses
 */

export type LeadClass = 'econ' | 'std' | 'express';

export type ProcessType = 'cnc_milling' | 'turning' | 'sheet' | 'im' | string;

export interface Tolerance {
  type: string;
  value: number;
}

export interface PricingRequest {
  process: ProcessType;
  material_code: string;
  quantity: number;
  lead_class: LeadClass;
  tolerances?: Record<string, Tolerance>;
  finishes?: string[];
  part_digest: string;
  catalog_version: string;
}

export interface PriceBreakdown {
  factor: string;
  amount: number;
}

export interface PricingResponse {
  subtotal: number;
  tax: number;
  total: number;
  lead_days: number;
  breakdown: PriceBreakdown[];
  pricing_hash: string;
  version: string;
  from_cache?: boolean;
}

// Extended response with internal tracking for optimistic calculations
export interface AnnotatedPricingResponse extends PricingResponse {
  __qty?: number;
  __mat?: string;
  __proc?: string;
  __lead?: LeadClass;
}

// Async job response when server needs time to compute
export interface PricingJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: PricingResponse;
  error?: string;
}
