import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { WebClient } from "@slack/web-api";
import {
  ReviewNotification,
  NotificationMessage,
  OrderDetails,
  ReviewDetails,
  NotificationTemplate,
} from "./notify.types";

// Narrow order notification shape for internal events
export interface OrderNotification {
  type: string; // e.g. 'order_status_changed', 'payment_received'
  orderId: string;
  amount?: number;
  currency?: string;
  status?: string; // canonical/db status after change
}

export interface QuoteStatusNotification {
  quoteId: string;
  status: string;
  previousStatus?: string;
  recipientEmail?: string | null;
  slackChannel?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotifyService {
  private readonly senderEmail: string;
  private readonly transporter: nodemailer.Transporter;
  public readonly slack: WebClient;

  constructor(private readonly configService: ConfigService) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get("SMTP_HOST"),
      port: this.configService.get("SMTP_PORT"),
      secure: true,
      auth: {
        user: this.configService.get("SMTP_USER"),
        pass: this.configService.get("SMTP_PASS"),
      },
    });

    // Initialize Slack client
    this.slack = new WebClient(this.configService.get("SLACK_BOT_TOKEN"));
    // Cache sender email (prevents undefined usage in sendOrderEmail)
    this.senderEmail = this.configService.get("SMTP_FROM") || "no-reply@example.com";
  }

  async sendReviewNotification(notification: ReviewNotification): Promise<void> {
    const subject = `Manual Review Required - Quote ${notification.quoteId}`;
    const body = `A manual review is required for quote ${notification.quoteId}.\n\nDue: ${notification.dueAt.toISOString()}`;

    if (notification.recipientEmail) {
      await this.sendEmail({
        to: notification.recipientEmail,
        subject,
        text: body,
      });
    }

    if (notification.slackChannel) {
      await this.slack.chat.postMessage({
        channel: notification.slackChannel,
        text: body,
      });
    }
  }

  async notify(message: NotificationMessage): Promise<void> {
    if (message.recipientEmail) {
      await this.sendEmail({
        to: message.recipientEmail,
        subject: message.subject,
        text: message.body,
        html: message.html,
      });
    }

    if (message.slackChannel) {
      await this.slack.chat.postMessage({
        channel: message.slackChannel,
        text: message.body,
      });
    }
  }

  async sendEmail(options: { to: string; subject: string; text: string; html?: string }): Promise<void> {
    await this.transporter.sendMail({
      from: this.senderEmail,
      ...options,
    });
  }

  async notifyQuoteStatusChange(notification: QuoteStatusNotification): Promise<void> {
    const recipientEmail = notification.recipientEmail
      || this.configService.get("ADMIN_EMAIL")
      || this.senderEmail;
    const slackChannel = notification.slackChannel
      || this.configService.get("SLACK_QUOTES_CHANNEL");

    const readableNext = notification.status.replace(/_/g, " ").toUpperCase();
    const readablePrev = notification.previousStatus
      ? notification.previousStatus.replace(/_/g, " ").toUpperCase()
      : undefined;
    const defaultSubject = `Quote ${notification.quoteId} → ${readableNext}`;
    const defaultText = `Quote ${notification.quoteId} transitioned${readablePrev ? ` from ${readablePrev}` : ''} to ${readableNext}.`;
    const metaLines = notification.metadata
      ? Object.entries(notification.metadata)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${key}: ${value}`)
      : [];
    const textBody = metaLines.length
      ? `${defaultText}\n\n${metaLines.join('\n')}`
      : defaultText;
    const htmlBody = metaLines.length
      ? `<p>${defaultText}</p><ul>${metaLines.map((line) => `<li>${line}</li>`).join('')}</ul>`
      : `<p>${defaultText}</p>`;

    if (recipientEmail) {
      await this.sendEmail({
        to: recipientEmail,
        subject: defaultSubject,
        text: textBody,
        html: htmlBody,
      });
    }

    if (slackChannel) {
      await this.slack.chat.postMessage({
        channel: slackChannel,
        text: `${defaultText}${metaLines.length ? `\n${metaLines.join('\n')}` : ''}`,
      });
    }
  }

  private async sendOrderEmail(orderId: string, template: NotificationTemplate): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.senderEmail,
        to: template.recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: {
          "X-Order-ID": orderId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to send email for order ${orderId}: ${error.message}`);
    }
  }

  async notifyOrderCreated(orderDetails: OrderDetails): Promise<void> {
    const template: NotificationTemplate = {
      recipientEmail: orderDetails.customerEmail,
      subject: "Order Confirmation",
      text: `Your order #${orderDetails.orderId} has been created. Thank you for your business!`,
      html: `<p>Your order #${orderDetails.orderId} has been created. Thank you for your business!</p>`,
    };

    await this.sendOrderEmail(orderDetails.orderId, template);
  }

  async notifyPaymentReceived(orderDetails: OrderDetails): Promise<void> {
    const template: NotificationTemplate = {
      recipientEmail: orderDetails.customerEmail,
      subject: "Payment Received",
      text: `Payment received for order #${orderDetails.orderId}. We'll start processing your order right away!`,
      html: `<p>Payment received for order #${orderDetails.orderId}. We'll start processing your order right away!</p>`,
    };

    await this.sendOrderEmail(orderDetails.orderId, template);
  }

  async notifyManualReviewNeeded(reviewDetails: ReviewDetails): Promise<void> {
    const recipientEmail = this.configService.get("ADMIN_EMAIL") || "admin@example.com";
    const template: NotificationTemplate = {
      recipientEmail,
      subject: "Manual Review Required",
      text: `A manual review is needed for item #${reviewDetails.itemId}. Please check the admin dashboard.`,
      html: `<p>A manual review is needed for item #${reviewDetails.itemId}. Please check the admin dashboard.</p>`,
    };

    await this.sendOrderEmail(reviewDetails.itemId, template);
  }

  async sendOrderNotification(notification: OrderNotification): Promise<void> {
    // Basic order notification - can be expanded as needed
    const readableType = notification.type.replace(/_/g, " ").toUpperCase();
    const subject = `Order ${readableType} - ${notification.orderId}`;
    const statusPart = notification.status ? ` (status: ${notification.status})` : "";
    const body = `Order ${notification.orderId} event: ${notification.type}${statusPart}.`;

    // For now we only log; future: route to email/slack templates
    // eslint-disable-next-line no-console
    console.info(`Order notification: ${subject} - ${body}`);
  }
}
