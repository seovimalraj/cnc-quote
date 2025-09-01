import { OrdersCreateRequest } from "@paypal/checkout-server-sdk/lib/orders/orders-create-request";

// The PayPal SDK doesn't provide type definitions, so we create our own
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

export interface PayPalOrderRequestBody {
  intent: "CAPTURE" | "AUTHORIZE";
  application_context: {
    brand_name?: string;
    landing_page?: string;
    shipping_preference?: string;
    user_action?: string;
    return_url?: string;
    cancel_url?: string;
  };
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
