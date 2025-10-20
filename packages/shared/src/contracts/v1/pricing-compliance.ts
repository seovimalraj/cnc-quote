/**
 * @module Contracts/Compliance
 * @ownership pricing
 * Canonical compliance snapshot schema attached to each pricing matrix row so API, web, and
 * analytics consumers can reason about guardrails (margin floors, risk markups, lead-time) without
 * rehydrating pricing internals. Versioned alongside other v1 pricing contracts for deterministic
 * replay of historical quotes.
 */
// Pricing compliance snapshot contracts (v1)

export type QuoteComplianceAlertSeverityV1 = 'info' | 'warning' | 'critical';

export type QuoteComplianceAlertCodeV1 =
  | 'margin_floor_breach'
  | 'manual_discount_high'
  | 'lead_time_override'
  | 'lead_time_capacity_risk'
  | 'dfm_high_risk'
  | 'risk_markup_applied'
  | 'manual_override_applied';

export interface QuoteComplianceAlertV1 {
  code: QuoteComplianceAlertCodeV1;
  severity: QuoteComplianceAlertSeverityV1;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface QuoteComplianceSurchargeV1 {
  code: string;
  label?: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

export interface QuoteComplianceSnapshotV1 {
  quantity: number;
  currency: string;
  unit_price: number;
  price_before_discounts: number;
  total_price: number;
  margin_percent: number;
  margin_floor_percent?: number | null;
  discount_percent?: number | null;
  manual_override_applied?: boolean;
  manual_override_percent?: number | null;
  lead_time_override_days?: number | null;
  risk_uplift_percent?: number | null;
  lead_time_option: 'standard' | 'expedited';
  expedited: boolean;
  lead_time_standard_days?: number | null;
  lead_time_expedited_days?: number | null;
  dfm_risk_severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  dfm_issue_tags?: string[];
  surcharges?: QuoteComplianceSurchargeV1[];
  alerts: QuoteComplianceAlertV1[];
  metadata?: Record<string, unknown>;
}

export interface QuoteComplianceMlAssistJobV1 {
  version: 1;
  quoteId: string;
  quoteItemId: string;
  orgId: string | null;
  traceId: string;
  eventIds: string[];
  triggeredAt: string;
  featureFlagKey: string;
}

export interface QuoteComplianceMlInsightV1 {
  id: string;
  quoteId: string;
  quoteItemId: string;
  orgId: string | null;
  model: string;
  version: number;
  rationaleText: string;
  remediationActions: string[];
  alerts: QuoteComplianceAlertV1[];
  quoteSnapshot?: QuoteComplianceSnapshotV1 | null;
  events?: Array<{ code: string; severity: QuoteComplianceAlertSeverityV1; message: string }>;
  rawResponse?: string;
  createdAt: string;
  featureFlagKey: string;
}
