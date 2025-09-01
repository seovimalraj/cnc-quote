// These are unused so we prefix with _
import type { Stripe as _Stripe } from "stripe";
import type * as _paypal from "@paypal/checkout-server-sdk";

export type PaymentProvider = "stripe" | "paypal";

export interface PaymentSessionResult {
  provider: PaymentProvider;
  sessionId?: string;
  orderId?: string;
  url: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderDetails {
  id: string;
  org_id: string;
  customer_id: string;
  quote_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_by: string;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export interface PaymentWebhookResult {
  orderId: string;
  status: string;
  amount?: number;
  currency?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
