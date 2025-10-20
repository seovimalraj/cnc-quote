import { z } from 'zod';

import {
  QuoteSummaryVNextSchema,
  QuoteLifecycleStatusVNextSchema,
  QuoteLineVNextSchema,
  QuoteTotalsVNextSchema,
} from './quote';
import {
  AbandonedQuoteVNextSchema,
  AbandonedQuotesListVNextSchema,
  QuoteTimelineEventVNextSchema,
  QuoteTimelineVNextSchema,
  KanbanOrderVNextSchema,
  KanbanBoardVNextSchema,
  AdminReviewSummaryItemVNextSchema,
  AdminReviewSummarySnapshotVNextSchema,
  AdminQueueSnapshotItemVNextSchema,
  AdminQueueSnapshotVNextSchema,
  AdminWebhookStatusItemVNextSchema,
  AdminWebhookStatusSnapshotVNextSchema,
  AdminErrorEventVNextSchema,
  AdminFailedJobEventVNextSchema,
  AdminErrorSnapshotVNextSchema,
  AdminDashboardKpiDeltaVNextSchema,
  AdminDashboardKpiVNextSchema,
  AdminDashboardStatsResponseVNextSchema,
} from './admin';
import {
  AdminReviewLaneVNextSchema,
  AdminReviewPriorityVNextSchema,
  AdminReviewItemVNextSchema,
  AdminReviewListResponseVNextSchema,
  AdminReviewDetailResponseVNextSchema,
  AdminReviewWorkspaceVNextSchema,
} from './admin-review';
import {
  PricingComputationVNextSchema,
  PricingEstimateRequestVNextSchema,
  PricingSourceVNextSchema,
  PricingInputLightSchema,
  PricingLineLightSchema,
  PricingShipToLightSchema,
  toV2PricingRequest,
  fromV2,
  toLegacyPricingRequest,
  fromLegacy,
  computeDeterministicEstimate,
} from './pricing';
import {
  DfmOptionVNextSchema,
  ToleranceListVNextSchema,
  FinishListVNextSchema,
  IndustryListVNextSchema,
  CertificationListVNextSchema,
  CriticalityListVNextSchema,
  DfmMaterialOptionVNextSchema,
  MaterialListVNextSchema,
} from './dfm-options';
import { UploadSpecSchema, UploadPresignSchema } from './uploads';
import { CadAnalysisVNextSchema } from './cad';
import { ShippingRateVNextSchema, ShippingRatesVNextSchema } from './shipping';
import { LinePricingVNextSchema, QuoteLineUpdateVNextSchema } from './quote-lines';
import {
  AdminDbLatencySampleVNextSchema,
  AdminDbLatencySnapshotVNextSchema,
  AdminSloSampleVNextSchema,
  AdminSloSnapshotVNextSchema,
} from './admin';
import {
  OrgInviteDetailsSchema,
  OrgInviteInviterSchema,
  OrgInviteRoleSchema,
  OrgInviteStatusSchema,
  OrgSummarySchema,
} from './invites';

export { QuoteSummaryVNextSchema, QuoteLifecycleStatusVNextSchema, QuoteLineVNextSchema, QuoteTotalsVNextSchema };
export {
  AbandonedQuoteVNextSchema,
  AbandonedQuotesListVNextSchema,
  QuoteTimelineEventVNextSchema,
  QuoteTimelineVNextSchema,
  KanbanOrderVNextSchema,
  KanbanBoardVNextSchema,
  AdminReviewSummaryItemVNextSchema,
  AdminReviewSummarySnapshotVNextSchema,
  AdminQueueSnapshotItemVNextSchema,
  AdminQueueSnapshotVNextSchema,
  AdminWebhookStatusItemVNextSchema,
  AdminWebhookStatusSnapshotVNextSchema,
  AdminErrorEventVNextSchema,
  AdminFailedJobEventVNextSchema,
  AdminErrorSnapshotVNextSchema,
  AdminDashboardKpiDeltaVNextSchema,
  AdminDashboardKpiVNextSchema,
  AdminDashboardStatsResponseVNextSchema,
};
export {
  AdminReviewLaneVNextSchema,
  AdminReviewPriorityVNextSchema,
  AdminReviewItemVNextSchema,
  AdminReviewListResponseVNextSchema,
  AdminReviewDetailResponseVNextSchema,
  AdminReviewWorkspaceVNextSchema,
};
export {
  AdminSloSampleVNextSchema,
  AdminSloSnapshotVNextSchema,
  AdminDbLatencySampleVNextSchema,
  AdminDbLatencySnapshotVNextSchema,
};
export {
  PricingComputationVNextSchema,
  PricingEstimateRequestVNextSchema,
  PricingSourceVNextSchema,
  PricingInputLightSchema,
  PricingLineLightSchema,
  PricingShipToLightSchema,
  toV2PricingRequest,
  fromV2,
  toLegacyPricingRequest,
  fromLegacy,
  computeDeterministicEstimate,
};
export {
  DfmOptionVNextSchema,
  ToleranceListVNextSchema,
  FinishListVNextSchema,
  IndustryListVNextSchema,
  CertificationListVNextSchema,
  CriticalityListVNextSchema,
  DfmMaterialOptionVNextSchema,
  MaterialListVNextSchema,
};
export { UploadSpecSchema, UploadPresignSchema };
export { CadAnalysisVNextSchema };
export { ShippingRateVNextSchema, ShippingRatesVNextSchema };
export { LinePricingVNextSchema, QuoteLineUpdateVNextSchema };
export {
  OrgInviteDetailsSchema,
  OrgInviteInviterSchema,
  OrgInviteRoleSchema,
  OrgInviteStatusSchema,
  OrgSummarySchema,
};

export type QuoteSummaryVNext = z.infer<typeof QuoteSummaryVNextSchema>;
export type QuoteLineVNext = z.infer<typeof QuoteLineVNextSchema>;
export type QuoteTotalsVNext = z.infer<typeof QuoteTotalsVNextSchema>;

export type AbandonedQuoteVNext = z.infer<typeof AbandonedQuoteVNextSchema>;
export type AbandonedQuotesListVNext = z.infer<typeof AbandonedQuotesListVNextSchema>;
export type QuoteTimelineEventVNext = z.infer<typeof QuoteTimelineEventVNextSchema>;
export type QuoteTimelineVNext = z.infer<typeof QuoteTimelineVNextSchema>;
export type KanbanOrderVNext = z.infer<typeof KanbanOrderVNextSchema>;
export type KanbanBoardVNext = z.infer<typeof KanbanBoardVNextSchema>;
export type AdminReviewSummaryItemVNext = z.infer<typeof AdminReviewSummaryItemVNextSchema>;
export type AdminReviewSummarySnapshotVNext = z.infer<typeof AdminReviewSummarySnapshotVNextSchema>;
export type AdminQueueSnapshotItemVNext = z.infer<typeof AdminQueueSnapshotItemVNextSchema>;
export type AdminQueueSnapshotVNext = z.infer<typeof AdminQueueSnapshotVNextSchema>;
export type AdminWebhookStatusItemVNext = z.infer<typeof AdminWebhookStatusItemVNextSchema>;
export type AdminWebhookStatusSnapshotVNext = z.infer<typeof AdminWebhookStatusSnapshotVNextSchema>;
export type AdminErrorEventVNext = z.infer<typeof AdminErrorEventVNextSchema>;
export type AdminFailedJobEventVNext = z.infer<typeof AdminFailedJobEventVNextSchema>;
export type AdminErrorSnapshotVNext = z.infer<typeof AdminErrorSnapshotVNextSchema>;
export type AdminDashboardKpiDeltaVNext = z.infer<typeof AdminDashboardKpiDeltaVNextSchema>;
export type AdminDashboardKpiVNext = z.infer<typeof AdminDashboardKpiVNextSchema>;
export type AdminDashboardStatsResponseVNext = z.infer<typeof AdminDashboardStatsResponseVNextSchema>;

export type AdminReviewItemVNext = z.infer<typeof AdminReviewItemVNextSchema>;
export type AdminReviewWorkspaceVNext = z.infer<typeof AdminReviewWorkspaceVNextSchema>;
export type AdminReviewListResponseVNext = z.infer<typeof AdminReviewListResponseVNextSchema>;
export type AdminReviewDetailResponseVNext = z.infer<typeof AdminReviewDetailResponseVNextSchema>;
export type AdminReviewLaneVNext = z.infer<typeof AdminReviewLaneVNextSchema>;
export type AdminReviewPriorityVNext = z.infer<typeof AdminReviewPriorityVNextSchema>;
export type AdminSloSampleVNext = z.infer<typeof AdminSloSampleVNextSchema>;
export type AdminSloSnapshotVNext = z.infer<typeof AdminSloSnapshotVNextSchema>;
export type AdminDbLatencySampleVNext = z.infer<typeof AdminDbLatencySampleVNextSchema>;
export type AdminDbLatencySnapshotVNext = z.infer<typeof AdminDbLatencySnapshotVNextSchema>;

export type PricingComputationVNext = z.infer<typeof PricingComputationVNextSchema>;
export type PricingEstimateRequestVNext = z.infer<typeof PricingEstimateRequestVNextSchema>;
export type PricingInputLight = z.infer<typeof PricingInputLightSchema>;
export type PricingLineLight = z.infer<typeof PricingLineLightSchema>;
export type PricingShipToLight = z.infer<typeof PricingShipToLightSchema>;
export type DfmOptionVNext = z.infer<typeof DfmOptionVNextSchema>;
export type DfmOptionListVNext = Array<DfmOptionVNext>;
export type DfmMaterialOptionVNext = z.infer<typeof DfmMaterialOptionVNextSchema>;
export type DfmMaterialListVNext = Array<DfmMaterialOptionVNext>;
export type UploadSpec = z.infer<typeof UploadSpecSchema>;
export type UploadPresign = z.infer<typeof UploadPresignSchema>;
export type CadAnalysisVNext = z.infer<typeof CadAnalysisVNextSchema>;
export type ShippingRateVNext = z.infer<typeof ShippingRateVNextSchema>;
export type ShippingRatesVNext = z.infer<typeof ShippingRatesVNextSchema>;
export type OrgInviteDetails = z.infer<typeof OrgInviteDetailsSchema>;
export type OrgInviteInviter = z.infer<typeof OrgInviteInviterSchema>;
export type OrgInviteRole = z.infer<typeof OrgInviteRoleSchema>;
export type OrgInviteStatus = z.infer<typeof OrgInviteStatusSchema>;
export type OrgSummary = z.infer<typeof OrgSummarySchema>;

