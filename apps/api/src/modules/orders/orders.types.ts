import { User } from "../types/user";
import { Quote } from "../modules/quotes/quotes.types";

export interface OrderResponse {
  id: string;
  quoteId: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  quote?: Quote;
  user?: User;
}

export interface CreateOrderRequest {
  quoteId: string;
  userId: string;
  paymentMethod: string;
  billingAddress: OrderAddress;
  shippingAddress: OrderAddress;
}

export interface OrderAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  orderId: string;
  paymentId?: string;
  paymentUrl?: string;
  error?: string;
}
