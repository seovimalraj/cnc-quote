import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { NotifyService } from '../notify/notify.service';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;
  private readonly paypal: paypal.PayPalHttpClient;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notify: NotifyService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });

    const environment = process.env.NODE_ENV === 'production'
      ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
      : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
    
    this.paypal = new paypal.core.PayPalHttpClient(environment);
  }

  async createCheckoutSession(quoteId: string, provider: 'stripe' | 'paypal' = 'stripe') {
    // Get quote details
    const { data: quote } = await this.supabase.client
      .from('quotes')
      .select(`
        *,
        customer:customers (email),
        items:quote_items (
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', quoteId)
      .single();

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (provider === 'stripe') {
      // Create line items for Stripe
      const lineItems = quote.items.map((item) => ({
        price_data: {
          currency: quote.currency.toLowerCase(),
          unit_amount: Math.round(item.unit_price * 100), // Convert to cents
          product_data: {
            name: 'Manufacturing Services',
            description: `Quantity: ${item.quantity}`,
          },
        },
        quantity: item.quantity,
      }));

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer_email: quote.customer.email,
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.APP_URL}/portal/orders?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/portal/quotes/${quoteId}`,
        metadata: {
          quote_id: quoteId,
          org_id: quote.org_id,
        },
      });

      return {
        provider: 'stripe',
        sessionId: session.id,
        url: session.url,
      };
    } else {
      // Create PayPal order
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        application_context: {
          return_url: `${process.env.APP_URL}/portal/orders/paypal/success`,
          cancel_url: `${process.env.APP_URL}/portal/quotes/${quoteId}`,
          brand_name: process.env.APP_NAME,
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
        },
        purchase_units: [
          {
            amount: {
              currency_code: quote.currency.toUpperCase(),
              value: quote.total_amount.toString(),
              breakdown: {
                item_total: {
                  currency_code: quote.currency.toUpperCase(),
                  value: quote.total_amount.toString(),
                },
              },
            },
            items: quote.items.map((item) => ({
              name: 'Manufacturing Services',
              description: `Quantity: ${item.quantity}`,
              unit_amount: {
                currency_code: quote.currency.toUpperCase(),
                value: item.unit_price.toString(),
              },
              quantity: item.quantity.toString(),
            })),
            custom_id: JSON.stringify({
              quote_id: quoteId,
              org_id: quote.org_id,
            }),
          },
        ],
      });

      const order = await this.paypal.execute(request);

      return {
        provider: 'paypal',
        orderId: order.result.id,
        url: order.result.links.find((link) => link.rel === 'approve').href,
      };
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleSuccessfulPayment(session);
          break;
        }
        
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.handleFailedPayment(paymentIntent);
          break;
        }
      }
    } catch (err) {
      this.logger.error('Error processing webhook:', err);
      throw err;
    }
  }

  private async handleSuccessfulPayment(session: Stripe.Checkout.Session) {
    const quoteId = session.metadata.quote_id;
    const orgId = session.metadata.org_id;

    // Get quote and items
    const { data: quote } = await this.supabase.client
      .from('quotes')
      .select(`
        *,
        items:quote_items (*)
      `)
      .eq('id', quoteId)
      .single();

    if (!quote) {
      throw new Error('Quote not found');
    }

    // Start transaction
    const { data: order } = await this.supabase.client
      .from('orders')
      .insert({
        org_id: orgId,
        customer_id: quote.customer_id,
        quote_id: quoteId,
        status: 'new',
        total_amount: quote.total_amount,
        currency: quote.currency,
      })
      .select()
      .single();

    // Create order items
    await this.supabase.client
      .from('order_items')
      .insert(
        quote.items.map((item) => ({
          order_id: order.id,
          quote_item_id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          status: 'new',
        }))
      );

    // Create payment record
    await this.supabase.client
      .from('payments')
      .insert({
        order_id: order.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        amount: quote.total_amount,
        currency: quote.currency,
        status: 'succeeded',
        metadata: session,
      });

    // Add status history
    await this.supabase.client
      .from('order_status_history')
      .insert({
        order_id: order.id,
        new_status: 'new',
        notes: 'Order created from successful payment',
        changed_by: quote.created_by,
      });

    // Send notifications
    await this.notify.sendOrderNotification({
      type: 'order_created',
      orderId: order.id,
      amount: quote.total_amount,
      currency: quote.currency,
    });
  }

  private async handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
    // Send notification about failed payment
    await this.notify.sendPaymentNotification({
      type: 'payment_failed',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      error: paymentIntent.last_payment_error?.message,
    });
  }

  async capturePayPalOrder(paypalOrderId: string) {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      request.prefer('return=representation');
      
      const captureResponse = await this.paypal.execute(request);
      const captureData = captureResponse.result;

      // Extract metadata from custom_id
      const { quote_id, org_id } = JSON.parse(
        captureData.purchase_units[0].custom_id
      );

      // Get quote and items
      const { data: quote } = await this.supabase.client
        .from('quotes')
        .select(`
          *,
          items:quote_items (*)
        `)
        .eq('id', quote_id)
        .single();

      if (!quote) {
        throw new Error('Quote not found');
      }

      // Create order
      const { data: order } = await this.supabase.client
        .from('orders')
        .insert({
          org_id,
          customer_id: quote.customer_id,
          quote_id,
          status: 'new',
          total_amount: quote.total_amount,
          currency: quote.currency,
        })
        .select()
        .single();

      // Create order items
      await this.supabase.client
        .from('order_items')
        .insert(
          quote.items.map((item) => ({
            order_id: order.id,
            quote_item_id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            status: 'new',
          }))
        );

      // Create payment record
      await this.supabase.client
        .from('payments')
        .insert({
          order_id: order.id,
          paypal_order_id: paypalOrderId,
          paypal_capture_id: captureData.purchase_units[0].payments.captures[0].id,
          amount: quote.total_amount,
          currency: quote.currency,
          status: 'succeeded',
          metadata: captureData,
        });

      // Add status history
      await this.supabase.client
        .from('order_status_history')
        .insert({
          order_id: order.id,
          new_status: 'new',
          notes: 'Order created from successful PayPal payment',
          changed_by: quote.created_by,
        });

      // Send notifications
      await this.notify.sendOrderNotification({
        type: 'order_created',
        orderId: order.id,
        amount: quote.total_amount,
        currency: quote.currency,
      });

      return {
        orderId: order.id,
        status: 'succeeded',
      };
    } catch (error) {
      this.logger.error('Error capturing PayPal payment:', error);
      throw error;
    }
  }
}
