// Contracts API
import * as V1 from './v1';
export const computeQuoteDiffSummaryV1 = V1.computeQuoteDiffSummaryV1;

export namespace ContractsV1 {
  // V1 Exports
  export type ProcessType = V1.ProcessType;
  export type LeadTimeOption = V1.LeadTimeOption;
  export type InspectionLevel = V1.InspectionLevel;
  export type PartConfigV1 = V1.PartConfigV1;
  export type PricingBreakdownV1 = V1.PricingBreakdownV1;
  export type CostFactorsV1 = V1.CostFactorsV1;
  export type DfmSeverityV1 = V1.DfmSeverityV1;
  export type DfmIssueV1 = V1.DfmIssueV1;
  export type DfmResultV1 = V1.DfmResultV1;
  export type QuoteLifecycleStatusV1 = V1.QuoteLifecycleStatusV1;
  export type QuoteItemV1 = V1.QuoteItemV1;
  export type QuotePricingTotalsV1 = V1.QuotePricingTotalsV1;
  export type QuoteMetaV1 = V1.QuoteMetaV1;
  export type QuoteV1 = V1.QuoteV1;
  export type QuoteSummaryV1 = V1.QuoteSummaryV1;
  export type QuoteRevisionSummaryV1 = V1.QuoteRevisionSummaryV1;
  export type QuoteRevisionApplyResultV1 = V1.QuoteRevisionApplyResultV1;

  // Realtime Events
  export type PricingUpdateEventV1 = V1.PricingUpdateEventV1;
  export type PricingOptimisticEventV1 = V1.PricingOptimisticEventV1;
  export type PricingMatrixRowPatchV1 = V1.PricingMatrixRowPatchV1;
  export type GeometryUpdateEventV1 = V1.GeometryUpdateEventV1;
  export type GeometryErrorEventV1 = V1.GeometryErrorEventV1;
  export type DfmUpdateEventV1 = V1.DfmUpdateEventV1;
  export type DfmPartialEventV1 = V1.DfmPartialEventV1;
  export type DfmErrorEventV1 = V1.DfmErrorEventV1;
  export type AnyRealtimeEventV1 = V1.AnyRealtimeEventV1;
}

// Namespace exported above suffices