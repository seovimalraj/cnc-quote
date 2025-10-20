/**
 * @module Contracts/PricingRationale
 * @ownership pricing
 * Deterministic contract for AI-generated quote rationale summaries. Persisted to Supabase and
 * cached in Redis so API, worker, and web clients share a single source of truth. Versioned under
 * v1 to keep parity with existing pricing contracts.
 */

import type { PricingBreakdownV1 } from './part-config';
import type { QuoteComplianceSnapshotV1 } from './pricing-compliance';

export type QuoteRationaleHighlightCategoryV1 =
  | 'material'
  | 'machining'
  | 'setup'
  | 'finish'
  | 'inspection'
  | 'overhead'
  | 'margin'
  | 'lead_time'
  | 'logistics'
  | 'surcharge'
  | 'discount'
  | 'other';

export interface QuoteRationaleBreakdownHighlightV1 {
  category: QuoteRationaleHighlightCategoryV1;
  description: string;
  amountImpact?: number | null;
  percentImpact?: number | null;
}

export interface QuoteRationaleSummaryV1 {
  quoteId: string;
  quoteRevisionId?: string | null;
  summaryText: string;
  breakdownHighlights: QuoteRationaleBreakdownHighlightV1[];
  modelVersion: string;
  generatedAt: string;
  traceId?: string | null;
  costSheetHash: string;
}

export interface QuoteRationaleCostSheetItemV1 {
  quoteItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  leadTimeDays?: number | null;
  breakdown?: PricingBreakdownV1 | null;
  compliance?: QuoteComplianceSnapshotV1 | null;
}

export interface QuoteRationaleCostSheetV1 {
  quoteId: string;
  pricingVersion: number;
  currency: string;
  subtotal: number;
  total: number;
  items: QuoteRationaleCostSheetItemV1[];
}

export interface QuoteRationaleCachePayloadV1 {
  summary: QuoteRationaleSummaryV1;
  costSheet: QuoteRationaleCostSheetV1;
}

export interface PricingRationaleSummaryJobV1 {
  version: 1;
  quoteId: string;
  quoteRevisionId?: string | null;
  orgId: string | null;
  traceId: string;
  pricingVersion: number;
  featureFlagKey: string;
  costSheetHash: string;
  costSheet: QuoteRationaleCostSheetV1;
}

export const QUOTE_RATIONALE_CACHE_PREFIX_V1 = 'pricing:rationale:v1';
export const QUOTE_RATIONALE_CACHE_TTL_SECONDS = 6 * 60 * 60;

export function buildQuoteRationaleCacheKeyV1(quoteId: string): string {
  return `${QUOTE_RATIONALE_CACHE_PREFIX_V1}:quote:${quoteId}`;
}

export function buildQuoteRationaleRevisionCacheKeyV1(quoteRevisionId: string): string {
  return `${QUOTE_RATIONALE_CACHE_PREFIX_V1}:revision:${quoteRevisionId}`;
}
