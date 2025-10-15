// Contracts API
import * as V1 from './v1';
import * as VNext from './vnext';

export const computeQuoteDiffSummaryV1 = V1.computeQuoteDiffSummaryV1;

/**
 * @deprecated Use ContractsVNext instead. V1 contracts are frozen and scheduled for removal once
 *             downstream callers migrate to the VNext variants.
 */
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

export namespace ContractsVNext {
  export const QuoteSummarySchema = VNext.QuoteSummaryVNextSchema;
  export const QuoteLineSchema = VNext.QuoteLineVNextSchema;
  export const QuoteLifecycleStatusSchema = VNext.QuoteLifecycleStatusVNextSchema;
  export const QuoteTotalsSchema = VNext.QuoteTotalsVNextSchema;

  export const AbandonedQuoteSchema = VNext.AbandonedQuoteVNextSchema;
  export const AbandonedQuoteListSchema = VNext.AbandonedQuotesListVNextSchema;
  export const QuoteTimelineEventSchema = VNext.QuoteTimelineEventVNextSchema;
  export const QuoteTimelineSchema = VNext.QuoteTimelineVNextSchema;
  export const KanbanOrderSchema = VNext.KanbanOrderVNextSchema;
  export const KanbanBoardSchema = VNext.KanbanBoardVNextSchema;

  export const AdminReviewItemSchema = VNext.AdminReviewItemVNextSchema;
  export const AdminReviewListSchema = VNext.AdminReviewListResponseVNextSchema;
  export const AdminReviewDetailSchema = VNext.AdminReviewDetailResponseVNextSchema;
  export const AdminReviewWorkspaceSchema = VNext.AdminReviewWorkspaceVNextSchema;

  export const PricingComputationSchema = VNext.PricingComputationVNextSchema;
  export const PricingEstimateRequestSchema = VNext.PricingEstimateRequestVNextSchema;
  export const PricingSourceSchema = VNext.PricingSourceVNextSchema;
  export const PricingInputLightSchema = VNext.PricingInputLightSchema;
  export const PricingLineLightSchema = VNext.PricingLineLightSchema;
  export const PricingShipToLightSchema = VNext.PricingShipToLightSchema;
  export const toV2PricingRequest = VNext.toV2PricingRequest;
  export const fromV2PricingResponse = VNext.fromV2;
  export const toLegacyPricingRequest = VNext.toLegacyPricingRequest;
  export const fromLegacyPricingResponse = VNext.fromLegacy;
  export const computeDeterministicEstimate = VNext.computeDeterministicEstimate;

  export const DfmOptionSchema = VNext.DfmOptionVNextSchema;
  export const ToleranceListSchema = VNext.ToleranceListVNextSchema;
  export const FinishListSchema = VNext.FinishListVNextSchema;
  export const IndustryListSchema = VNext.IndustryListVNextSchema;
  export const CertificationListSchema = VNext.CertificationListVNextSchema;
  export const CriticalityListSchema = VNext.CriticalityListVNextSchema;
  export const MaterialListSchema = VNext.MaterialListVNextSchema;

  export const UploadSpecSchema = VNext.UploadSpecSchema;
  export const UploadPresignSchema = VNext.UploadPresignSchema;
  export const CadAnalysisSchema = VNext.CadAnalysisVNextSchema;
  export const ShippingRateSchema = VNext.ShippingRateVNextSchema;
  export const ShippingRatesSchema = VNext.ShippingRatesVNextSchema;
  export const LinePricingSchema = VNext.LinePricingVNextSchema;
  export const QuoteLineUpdateSchema = VNext.QuoteLineUpdateVNextSchema;

  export type QuoteSummaryVNext = VNext.QuoteSummaryVNext;
  export type QuoteLineVNext = VNext.QuoteLineVNext;
  export type QuoteTotalsVNext = VNext.QuoteTotalsVNext;

  export type AdminReviewItemVNext = VNext.AdminReviewItemVNext;
  export type AdminReviewWorkspaceVNext = VNext.AdminReviewWorkspaceVNext;
  export type AdminReviewListResponseVNext = VNext.AdminReviewListResponseVNext;
  export type AdminReviewDetailResponseVNext = VNext.AdminReviewDetailResponseVNext;

  export type PricingComputationVNext = VNext.PricingComputationVNext;
  export type PricingEstimateRequestVNext = VNext.PricingEstimateRequestVNext;
  export type PricingInputLight = VNext.PricingInputLight;
  export type PricingLineLight = VNext.PricingLineLight;
  export type PricingShipToLight = VNext.PricingShipToLight;
  export type DfmOptionVNext = VNext.DfmOptionVNext;
  export type DfmOptionListVNext = VNext.DfmOptionListVNext;
  export type DfmMaterialOptionVNext = VNext.DfmMaterialOptionVNext;
  export type DfmMaterialListVNext = VNext.DfmMaterialListVNext;
  export type AbandonedQuoteVNext = VNext.AbandonedQuoteVNext;
  export type AbandonedQuotesListVNext = VNext.AbandonedQuotesListVNext;
  export type QuoteTimelineEventVNext = VNext.QuoteTimelineEventVNext;
  export type QuoteTimelineVNext = VNext.QuoteTimelineVNext;
  export type KanbanOrderVNext = VNext.KanbanOrderVNext;
  export type KanbanBoardVNext = VNext.KanbanBoardVNext;
  export type UploadSpec = VNext.UploadSpec;
  export type UploadPresign = VNext.UploadPresign;
  export type CadAnalysisVNext = VNext.CadAnalysisVNext;
  export type ShippingRateVNext = VNext.ShippingRateVNext;
  export type ShippingRatesVNext = VNext.ShippingRatesVNext;
}

// Namespace exported above suffices