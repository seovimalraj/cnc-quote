import { Stripe } from "stripe";
import type * as paypal from "@paypal/checkout-server-sdk";

export type PaymentProvider = "stripe" | "paypal";

export interface PaymentSessionResult {
  provider: PaymentProvider;
  sessionId?: string;
  orderId?: string;
  url: string;
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
}
