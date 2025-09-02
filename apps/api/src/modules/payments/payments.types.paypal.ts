// import { OrdersCreateRequest } from "@paypal/checkout-server-sdk/lib/orders/orders-create-request";

// The PayPal SDK doesn't provide proper type definitions, so we create our own
interface OrdersCreateRequest {
  requestBody: (body: Record<string, unknown>) => OrdersCreateRequest;
}

interface PayPalAmount {
  currency_code: string;
  value: string;
}

interface PayPalItem {
  name: string;
  unit_amount: PayPalAmount;
  quantity: string;
}

interface _PayPalPurchaseUnit {
  amount: PayPalAmount & {
    breakdown?: {
      item_total?: PayPalAmount;
    };
  };
  items?: PayPalItem[];
  description?: string;
  reference_id?: string;
}

// PayPal payment types and interfaces

export interface PayPalPaymentIntent {
  intent: "CAPTURE" | "AUTHORIZE";
  application_context?: Record<string, unknown>; // PayPal-specific context
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
      breakdown?: {
        item_total?: {
          currency_code: string;
          value: string;
        };
      };
    };
    items?: Array<{
      name: string;
      unit_amount: {
        currency_code: string;
        value: string;
      };
      quantity: string;
    }>;
    description?: string;
    reference_id?: string;
  }>;
}

export type PayPalRequest = OrdersCreateRequest;
