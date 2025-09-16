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
  recipientEmail: string;
  subject: string;
  text: string;
  html?: string;
}

export interface ReviewNotification {
  quoteId: string;
  ruleId: string;
  dueAt: Date;
  recipientEmail?: string;
  slackChannel?: string;
}

export interface NotificationMessage {
  subject: string;
  body: string;
  html?: string;
  recipientEmail?: string;
  slackChannel?: string;
}
