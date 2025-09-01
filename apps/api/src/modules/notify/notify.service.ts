import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotifyService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: true,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to,
      subject,
      text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async notifyOrderCreated(orderDetails: any): Promise<void> {
    await this.sendEmail(
      orderDetails.customerEmail,
      'Order Confirmation',
      `Your order #${orderDetails.orderId} has been created. Thank you for your business!`,
    );
  }

  async notifyPaymentReceived(orderDetails: any): Promise<void> {
    await this.sendEmail(
      orderDetails.customerEmail,
      'Payment Received',
      `Payment received for order #${orderDetails.orderId}. We'll start processing your order right away!`,
    );
  }

  async notifyManualReviewNeeded(reviewDetails: any): Promise<void> {
    const adminEmail = this.configService.get('ADMIN_EMAIL');
    await this.sendEmail(
      adminEmail,
      'Manual Review Required',
      `A manual review is needed for item #${reviewDetails.itemId}. Please check the admin dashboard.`,
    );
  }
}