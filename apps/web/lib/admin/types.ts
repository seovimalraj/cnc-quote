export type Lane = 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export type Priority = 'LOW' | 'MED' | 'HIGH' | 'EXPEDITE';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NOK' | 'INR';

export type AdminReviewItem = {
  id: string;
  quoteNo: string;
  customerName: string;
  company: string;
  createdAt: string;
  submittedBy: string;
  lane: Lane;
  statusReason?: string | null;
  totalItems: number;
  totalValue: number;
  currency: CurrencyCode;
  dfmFindingCount: number;
  priority: Priority;
  assignee?: string | null;
  lastActionAt?: string | null;
};

export type AdminTableRow = AdminReviewItem & { readonly __tableRowBrand?: never };

export type PageMeta = {
  nextCursor?: string | null;
  limit: number;
  totalApprox?: number | null;
};

export type ReviewStats = {
  totalRows: number;
  totalValue: number;
  conversionRate: number;
};

export type ReviewListResponse = {
  data: AdminReviewItem[];
  meta: PageMeta;
  stats: ReviewStats;
};

export type ReviewDetailResponse = {
  item: AdminReviewItem;
  workspace: {
    dfm: {
      id: string;
      severity: 'LOW' | 'MED' | 'HIGH';
      rule: string;
      partId?: string | null;
      message: string;
      createdAt: string;
    }[];
    pricingSummary: {
      materialCost: number;
      machiningCost: number;
      finishingCost: number;
      total: number;
      currency: CurrencyCode;
    };
    activity: {
      id: string;
      actor: string;
      action: string;
      at: string;
      meta?: Record<string, unknown>;
    }[];
    notes: {
      id: string;
      author: string;
      text: string;
      at: string;
    }[];
  };
};
