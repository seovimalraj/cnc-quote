export interface QuoteFile {
  id: string;
  name: string;
  url: string;
  metrics?: {
    volume: number;
    surface_area: number;
    bbox: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
    primitive_features: {
      holes: number;
      pockets: number;
      slots: number;
      faces: number;
    };
  };
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  file_id: string;
  material_id: string;
  finish_id: string;
  tolerance_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  lead_time_days: number;
  process_type?: string;
  file?: {
    name: string;
  };
  material?: {
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  organization_id: string;
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'sent';
  currency: string;
  subtotal: number;
  total: number;
  total_amount: number;
  expires_at?: string;
  email_sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  terms?: string;
  notes?: string;
  customer?: {
    name: string;
    email: string;
    address: string;
  };
  price_profile?: {
    name: string;
    machine: {
      name: string;
    };
  };
  dfm_ruleset?: {
    name: string;
  };
  items: QuoteItem[];
  created_at: string;
  updated_at: string;
}
