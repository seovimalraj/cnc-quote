export interface OrderDetails {
  orderId: string;
  customerEmail: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
}

export interface ReviewDetails {
  itemId: string;
  type: string;
  reason: string;
  priority?: string;
}

export interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
}
