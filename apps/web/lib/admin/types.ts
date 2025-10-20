import { ContractsVNext } from '@cnc-quote/shared';

export type Lane = ContractsVNext.AdminReviewLaneVNext;
export type Priority = ContractsVNext.AdminReviewPriorityVNext;
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NOK' | 'INR';

export type AdminReviewItem = ContractsVNext.AdminReviewItemVNext & {
  quoteNo?: string | null;
};

export type AdminTableRow = AdminReviewItem & { readonly __tableRowBrand?: never };

export type ReviewListResponse = {
  data: AdminReviewItem[];
  meta: ContractsVNext.AdminReviewListResponseVNext['meta'];
  stats: ContractsVNext.AdminReviewListResponseVNext['stats'];
};

export type ReviewDetailResponse = {
  item: AdminReviewItem;
  workspace: ContractsVNext.AdminReviewDetailResponseVNext['workspace'];
};

export type PageMeta = ReviewListResponse['meta'];
export type ReviewStats = ReviewListResponse['stats'];
