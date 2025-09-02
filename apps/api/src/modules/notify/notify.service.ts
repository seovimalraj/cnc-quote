import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { WebClient } from "@slack/web-api";
import { ReviewNotification, NotificationMessage, OrderDetails, ReviewDetails, NotificationTemplate } from "./notify.types";

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
      });
    }

    if (message.slackChannel) {
      await this.slack.chat.postMessage({
        channel: message.slackChannel,
        text: message.body,
      });
    }
  }

  private async sendEmail(options: { to: string; subject: string; text: string }): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get("SMTP_FROM"),
      ...options,
    });
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
}
