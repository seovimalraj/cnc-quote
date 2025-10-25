// Base part-config related exports (explicit to avoid collisions)
export type {
	ProcessType,
	LeadTimeOption,
	ToleranceClass,
	InspectionLevel,
	GeometryMetricsV1,
	PricingBreakdownV1,
	QuantityPricePointV1,
	DfmIssueV1,
	PartConfigV1,
	QuoteSummaryV1,
} from './part-config';

export type {
	CostFactorsV1,
	PricingComputationInputV1,
	PricingBreakdownDetailedV1,
} from './pricing';

export type {
	QuoteComplianceAlertV1,
	QuoteComplianceAlertCodeV1,
	QuoteComplianceAlertSeverityV1,
	QuoteComplianceSnapshotV1,
	QuoteComplianceSurchargeV1,
	QuoteComplianceMlAssistJobV1,
	QuoteComplianceMlInsightV1,
} from './pricing-compliance';

export type {
	AdminRecentEventDiffV1,
	AdminRecentEventAlertV1,
	AdminRecentEventAlertSeverityV1,
	AdminRecentEventActorV1,
	AdminRecentEventTargetV1,
	AdminRecentEventV1,
	AdminRecentEventsResponseV1,
} from './admin-events';

export type {
	AdminCmsStatusV1,
	AdminCmsPageV1,
	AdminCmsDocumentV1,
	AdminCmsPagesResponseV1,
	AdminCmsDocumentsResponseV1,
} from './admin-content';

// Full DFM taxonomy exports (distinct issue type definition)
export type {
	DfmSeverityV1,
	DfmIssueCategoryV1,
	DfmIssueRefV1,
	DfmIssueV1 as TaxonomyDfmIssueV1,
	DfmResultV1,
} from './dfm';

export type {
	QuoteLifecycleStatusV1,
	QuoteItemV1,
	QuotePricingTotalsV1,
	QuoteMetaV1,
	QuoteV1,
	QuoteSummaryV1 as QuoteApiSummaryV1,
	QuoteRevisionSummaryV1,
	QuoteRevisionApplyResultV1,
} from './quote';
export { computeQuoteDiffSummaryV1 } from './quote';

export type {
	QuoteRationaleHighlightCategoryV1,
	QuoteRationaleBreakdownHighlightV1,
	QuoteRationaleSummaryV1,
	QuoteRationaleCostSheetItemV1,
	QuoteRationaleCostSheetV1,
	QuoteRationaleCachePayloadV1,
	PricingRationaleSummaryJobV1,
} from './pricing-rationale';
export {
	QUOTE_RATIONALE_CACHE_PREFIX_V1,
	QUOTE_RATIONALE_CACHE_TTL_SECONDS,
	buildQuoteRationaleCacheKeyV1,
	buildQuoteRationaleRevisionCacheKeyV1,
} from './pricing-rationale';

export {
	AdminPricingRevisionAssistantRequestSchemaV1,
	AdminPricingRevisionAssistantAdjustmentSchemaV1,
	AdminPricingRevisionAssistantLLMResponseSchemaV1,
	AdminPricingRevisionAssistantStatusSchemaV1,
	AdminPricingRevisionAssistantApprovalDecisionSchemaV1,
	AdminPricingRevisionDualControlStateSchemaV1,
	AdminPricingRevisionAssistantApprovalSchemaV1,
	AdminPricingRevisionAssistantApprovalRequestSchemaV1,
	AdminPricingRevisionAssistantRunSchemaV1,
} from './admin-pricing-assistant';
export type {
	AdminPricingRevisionAssistantRequestV1,
	AdminPricingRevisionAssistantAdjustmentV1,
	AdminPricingRevisionAssistantLLMResponseV1,
	AdminPricingRevisionAssistantStatusV1,
	AdminPricingRevisionAssistantApprovalDecisionV1,
	AdminPricingRevisionDualControlStateV1,
	AdminPricingRevisionAssistantApprovalV1,
	AdminPricingRevisionAssistantApprovalRequestV1,
	AdminPricingRevisionAssistantRunV1,
} from './admin-pricing-assistant';

export type {
	AIModelRunStatusV1,
	AIModelRunV1,
	AIModelReviewStatusV1,
	AIModelBiasReviewV1,
} from './ai-model';

// Pricing recalculation job contracts
export type { PricingRecalcJobV1, PricingRecalcReasonV1 } from './pricing-recalc';
export type {
	PricingRecalcRunV1,
	PricingRecalcItemV1,
	PricingRecalcRunStatusV1,
	PricingRecalcItemStatusV1,
} from './pricing-recalc-status';

// Supplier portal contracts (capabilities, approvals, events)
export {
	SupplierCapabilitySchemaV1,
	SupplierApprovalSchemaV1,
	SupplierEventKindV1,
	SupplierCapabilityUpdatedEventSchemaV1,
	SupplierApprovalRecordedEventSchemaV1,
} from './supplier';
export type {
	SupplierCapabilityV1,
	SupplierApprovalV1,
	SupplierCapabilityUpdatedEventV1,
	SupplierApprovalRecordedEventV1,
} from './supplier';

// Realtime events: import then re-export to avoid resolution glitches & name collisions
import * as Realtime from './realtime-events';
export type RealtimeEventKindV1 = Realtime.RealtimeEventKindV1;
export type BaseRealtimeEventV1<TKind extends RealtimeEventKindV1 = RealtimeEventKindV1, TPayload = unknown> = Realtime.BaseRealtimeEventV1<TKind, TPayload>;
export type GeometryUpdatePayloadV1 = Realtime.GeometryUpdatePayloadV1;
export type GeometryUpdateEventV1 = Realtime.GeometryUpdateEventV1;
export type GeometryErrorEventV1 = Realtime.GeometryErrorEventV1;
export type PricingMatrixRowPatchV1 = Realtime.PricingMatrixRowPatchV1;
export type PricingUpdatePayloadV1 = Realtime.PricingUpdatePayloadV1;
export type PricingUpdateEventV1 = Realtime.PricingUpdateEventV1;
export type PricingOptimisticEventV1 = Realtime.PricingOptimisticEventV1;
export type DfmIssuePatchV1 = Realtime.DfmIssuePatchV1;
export type DfmUpdatePayloadV1 = Realtime.DfmUpdatePayloadV1;
export type DfmUpdateEventV1 = Realtime.DfmUpdateEventV1;
export type DfmPartialEventV1 = Realtime.DfmPartialEventV1;
export type DfmErrorEventV1 = Realtime.DfmErrorEventV1;
export type AnyRealtimeEventV1 = Realtime.AnyRealtimeEventV1;