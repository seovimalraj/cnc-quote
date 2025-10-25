export type PaymentProvider = "paypal";

export interface PaymentSessionResult {
  provider: PaymentProvider;
  sessionId?: string; // Reserved (not used for PayPal)
  orderId?: string;
  url: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderDetails {
  id: string;
  org_id: string;
  customer_id: string;
  quote_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_by?: string | null;
  items: OrderItem[];
  customer?: {
    email: string;
    name: string;
  };
}

export interface PaymentWebhookResult {
  orderId: string;
  status: string;
  amount?: number;
  currency?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
