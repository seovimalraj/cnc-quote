export interface Order {
  id: string;
  quote_id: string;
  status: 'Pending' | 'In_Production' | 'QA_Incoming' | 'QA_Final' | 'Ready_To_Ship' | 'Shipped' | 'Completed' | 'On_Hold' | 'Cancelled' | 'Refunded';
  source: 'web' | 'widget' | 'large_order';
  created_at: string;
  updated_at: string;
  eta_date?: string;
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    grand_total: number;
  };
  addresses: {
    billing: {
      name: string;
      line1: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    shipping: {
      name: string;
      line1: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  shipping_method?: string;
  incoterms?: 'EXW' | 'FOB' | 'DDP';
  shipments: Shipment[];
  documents: Document[];
  invoices: Invoice[];
  messages: Message[];
}

export interface Shipment {
  id: string;
  carrier: 'UPS' | 'FedEx' | 'DHL' | 'USPS' | 'Other';
  service: 'Ground' | '2Day' | 'Overnight' | 'Freight' | 'Int\'l';
  tracking_numbers: string[];
  status: 'Label_Created' | 'In_Transit' | 'Out_For_Delivery' | 'Delivered' | 'Exception';
  packages: Array<{
    weight_kg: number;
    dimensions_cm: [number, number, number];
  }>;
  events: TrackingEvent[];
  ship_date?: string;
  delivery_date?: string;
  docs: Document[];
}

export interface TrackingEvent {
  ts: string;
  location: string;
  status: string;
  description: string;
}

export interface Document {
  id: string;
  type: 'QAP' | 'Certificate' | 'FAIR' | 'Measurement' | 'Invoice' | 'Receipt' | 'CoC' | 'MaterialCert';
  title: string;
  status: 'Draft' | 'Generating' | 'Ready' | 'Failed' | 'Revoked';
  version: number;
  file_id: string;
  linked_type: 'Quote' | 'Order' | 'Part' | 'Organization';
  linked_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  checksum_sha256?: string;
}

export interface File {
  id: string;
  name: string;
  mime: string;
  size_bytes: number;
  kind: 'CAD' | 'Drawing' | 'PDF' | 'Image' | 'Zip' | 'Other';
  owner_org_id: string;
  linked_type?: 'Quote' | 'Order' | 'Part';
  linked_id?: string;
  preview_ready: boolean;
  created_at: string;
}

export interface QAPTemplate {
  id: string;
  name: string;
  process: 'CNC' | 'Sheet' | 'Molding';
  revision: string;
}

export interface Invoice {
  id: string;
  order_id: string;
  status: 'Open' | 'Paid' | 'Refunded';
  amount: number;
  currency: string;
  created_at: string;
}

export interface Message {
  id: string;
  author: string;
  role: 'buyer' | 'support';
  body: string;
  attachments: Document[];
  created_at: string;
}

export interface OrderTimelineStep {
  name: string;
  ts?: string;
  actor?: string;
  note?: string;
}

export interface OrderFilters {
  status?: string[];
  date_range?: {
    from?: string;
    to?: string;
  };
  value?: string;
  source?: string;
  q?: string;
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  page: number;
  page_size: number;
}
