export interface QuoteItem {
  id?: string;
  unit_price: number;
  quantity: number;
  total_price?: number;
  name?: string;
  description?: string;
}

export interface Quote {
  id: string;
  currency: string;
  items: QuoteItem[];
  total_amount: number;
  customer_id: string;
  customer?: {
    email: string;
    name: string;
  };
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  org_id?: string;
  quote_id?: string;
}
