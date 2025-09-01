export interface Quote {
  id: string;
  status: 'tbd_pending' | 'quoted' | 'accepted' | 'rejected';
  currency: string;
  price?: number;
  manual_review_tasks?: Array<{
    status: string;
    due_at: string;
    rule?: {
      message: string;
    };
  }>;
}

export interface QuoteEta {
  type: 'manual_review';
  dueIn: string;
  dueDate: Date;
  message: string;
}
