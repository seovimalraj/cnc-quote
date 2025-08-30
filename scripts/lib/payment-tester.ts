import Stripe from 'stripe';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

interface PaymentTestConfig {
  stripeSecret: string;
  stripeKey: string;
  webhookEndpoint: string;
  apiUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  token: string;
}

interface OrderResult {
  orderId: string;
  quoteId: string;
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
}

interface WebhookResult {
  received: boolean;
  statusCode: number;
  eventType: string;
  paymentIntentId: string;
}

interface TestResult {
  success: boolean;
  checkout: {
    sessionId: string;
    url: string;
  };
  payment: {
    id: string;
    status: string;
    amount: number;
    currency: string;
  };
  webhook: WebhookResult;
  order: OrderResult;
  error?: any;
}

export class PaymentTester {
  private stripe: Stripe;
  private config: PaymentTestConfig;
  private supabase;

  constructor(config: PaymentTestConfig) {
    this.config = config;
    this.stripe = new Stripe(config.stripeSecret, {
      apiVersion: '2023-08-16'
    });
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  private async createCheckoutSession(quoteId: string): Promise<Stripe.Checkout.Session> {
    // Get quote details from API
    const quoteResponse = await axios.get(
      `${this.config.apiUrl}/api/quotes/${quoteId}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.token}`
        }
      }
    );

    const quote = quoteResponse.data;

    // Create Stripe checkout session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${this.config.apiUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.apiUrl}/orders/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        quote_id: quoteId
      },
      line_items: [{
        price_data: {
          currency: quote.currency.toLowerCase(),
          product_data: {
            name: `Quote ${quoteId}`,
            description: `${quote.process_type} - Qty: ${quote.quantity}`
          },
          unit_amount: Math.round(quote.unit_price * 100),
        },
        quantity: quote.quantity
      }],
      customer_email: 'test@example.com'
    });

    return session;
  }

  private async simulatePayment(sessionId: string): Promise<Stripe.PaymentIntent> {
    // Get payment intent from session
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId = session.payment_intent as string;

    // Create test payment method
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2025,
        cvc: '314',
      },
    });

    // Attach payment method to intent
    const intent = await this.stripe.paymentIntents.update(paymentIntentId, {
      payment_method: paymentMethod.id
    });

    // Confirm payment
    return await this.stripe.paymentIntents.confirm(paymentIntentId);
  }

  private async waitForWebhook(paymentIntentId: string, timeoutMs = 30000): Promise<WebhookResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      // Check for payment record in database
      const { data: payment } = await this.supabase
        .from('payments')
        .select('webhook_status, webhook_event_type')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (payment) {
        return {
          received: true,
          statusCode: payment.webhook_status,
          eventType: payment.webhook_event_type,
          paymentIntentId
        };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      received: false,
      statusCode: 0,
      eventType: '',
      paymentIntentId
    };
  }

  private async waitForOrder(quoteId: string, timeoutMs = 30000): Promise<OrderResult | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const { data: order } = await this.supabase
        .from('orders')
        .select('id, quote_id, payment_id, status, amount, currency')
        .eq('quote_id', quoteId)
        .single();

      if (order) {
        return {
          orderId: order.id,
          quoteId: order.quote_id,
          paymentId: order.payment_id,
          status: order.status,
          amount: order.amount,
          currency: order.currency
        };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return null;
  }

  async runTest(quoteId: string): Promise<TestResult> {
    try {
      // Create checkout session
      const session = await this.createCheckoutSession(quoteId);
      
      // Simulate payment
      const paymentIntent = await this.simulatePayment(session.id);
      
      // Wait for webhook processing
      const webhookResult = await this.waitForWebhook(paymentIntent.id);
      
      // Wait for order creation
      const orderResult = await this.waitForOrder(quoteId);

      if (!orderResult) {
        throw new Error('Order was not created after payment');
      }

      return {
        success: 
          webhookResult.received &&
          webhookResult.statusCode === 200 &&
          orderResult.status === 'new',
        checkout: {
          sessionId: session.id,
          url: session.url!
        },
        payment: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        },
        webhook: webhookResult,
        order: orderResult
      };

    } catch (error: any) {
      return {
        success: false,
        checkout: { sessionId: '', url: '' },
        payment: { id: '', status: '', amount: 0, currency: '' },
        webhook: {
          received: false,
          statusCode: 0,
          eventType: '',
          paymentIntentId: ''
        },
        order: {
          orderId: '',
          quoteId: '',
          paymentId: '',
          status: '',
          amount: 0,
          currency: ''
        },
        error: {
          message: error.message,
          response: error.response?.data
        }
      };
    }
  }
}
