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
} from './admin';
import {
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

export { QuoteSummaryVNextSchema, QuoteLifecycleStatusVNextSchema, QuoteLineVNextSchema, QuoteTotalsVNextSchema };
export {
  AbandonedQuoteVNextSchema,
  AbandonedQuotesListVNextSchema,
  QuoteTimelineEventVNextSchema,
  QuoteTimelineVNextSchema,
  KanbanOrderVNextSchema,
  KanbanBoardVNextSchema,
};
export {
  AdminReviewItemVNextSchema,
  AdminReviewListResponseVNextSchema,
  AdminReviewDetailResponseVNextSchema,
  AdminReviewWorkspaceVNextSchema,
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

export type QuoteSummaryVNext = z.infer<typeof QuoteSummaryVNextSchema>;
export type QuoteLineVNext = z.infer<typeof QuoteLineVNextSchema>;
export type QuoteTotalsVNext = z.infer<typeof QuoteTotalsVNextSchema>;

export type AbandonedQuoteVNext = z.infer<typeof AbandonedQuoteVNextSchema>;
export type AbandonedQuotesListVNext = z.infer<typeof AbandonedQuotesListVNextSchema>;
export type QuoteTimelineEventVNext = z.infer<typeof QuoteTimelineEventVNextSchema>;
export type QuoteTimelineVNext = z.infer<typeof QuoteTimelineVNextSchema>;
export type KanbanOrderVNext = z.infer<typeof KanbanOrderVNextSchema>;
export type KanbanBoardVNext = z.infer<typeof KanbanBoardVNextSchema>;

export type AdminReviewItemVNext = z.infer<typeof AdminReviewItemVNextSchema>;
export type AdminReviewWorkspaceVNext = z.infer<typeof AdminReviewWorkspaceVNextSchema>;
export type AdminReviewListResponseVNext = z.infer<typeof AdminReviewListResponseVNextSchema>;
export type AdminReviewDetailResponseVNext = z.infer<typeof AdminReviewDetailResponseVNextSchema>;

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

