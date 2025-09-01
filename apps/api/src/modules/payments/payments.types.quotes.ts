export interface QuoteItem {
  unit_price: number;
  quantity: number;
  name?: string;
  description?: string;
}

export interface Quote {
  id: string;
  currency: string;
  items: QuoteItem[];
  total_amount: number;
  customer?: {
    email: string;
    name: string;
  };
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  org_id?: string;
}
