import { Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { NotifyService } from "../notify/notify.service";
import * as paypal from "@paypal/checkout-server-sdk";
import { OrderDetails, PaymentProvider, PaymentSessionResult } from "./payments.types";
import { PaymentProviderError, QuoteNotFoundError } from "./payments.errors";

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
      apiVersion: "2025-08-27.basil",
    });

    const environment =
      process.env.NODE_ENV === "production"
        ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
        : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

    this.paypal = new paypal.core.PayPalHttpClient(environment);
  }

  private async getQuoteDetails(quoteId: string): Promise<OrderDetails> {
    const { data: quote } = await this.supabase.client
      .from("quotes")
      .select(
        `
        *,
        items:quote_items (*)
      `,
      )
      .eq("id", quoteId)
      .single();

    if (!quote) {
      throw new QuoteNotFoundError(quoteId);
    }

    return {
      id: quote.id,
      org_id: quote.org_id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      status: quote.status,
      total_amount: quote.total_amount,
      currency: quote.currency,
      created_by: quote.created_by,
      items: quote.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
    };
  }

  private async createOrderFromQuote(quote: OrderDetails, orgId: string) {
    const { data: order } = await this.supabase.client
      .from("orders")
      .insert({
        org_id: orgId,
        customer_id: quote.customer_id,
        quote_id: quote.id,
        status: "new",
        total_amount: quote.total_amount,
        currency: quote.currency,
      })
      .select()
      .single();

    await this.supabase.client.from("order_items").insert(
      quote.items.map((item) => ({
        order_id: order.id,
        quote_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        status: "new",
      })),
    );

    return order;
  }

  private async addOrderStatusHistory(orderId: string, status: string, notes: string, changedBy: string) {
    await this.supabase.client.from("order_status_history").insert({
      order_id: orderId,
      new_status: status,
      notes,
      changed_by: changedBy,
    });
  }

  private async createStripeCheckoutSession(quote: any): Promise<PaymentSessionResult> {
    const lineItems = quote.items.map((item) => ({
      price_data: {
        currency: quote.currency.toLowerCase(),
        unit_amount: Math.round(item.unit_price * 100), // Convert to cents
        product_data: {
          name: "Manufacturing Services",
          description: `Quantity: ${item.quantity}`,
        },
      },
      quantity: item.quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      customer_email: quote.customer.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.APP_URL}/portal/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/portal/quotes/${quote.id}`,
      metadata: {
        quote_id: quote.id,
        org_id: quote.org_id,
      },
    });

    return {
      provider: "stripe",
      sessionId: session.id,
      url: session.url,
    };
  }

  private async createPayPalCheckoutSession(quote: any): Promise<PaymentSessionResult> {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      application_context: {
        return_url: `${process.env.APP_URL}/portal/orders/paypal/success`,
        cancel_url: `${process.env.APP_URL}/portal/quotes/${quote.id}`,
        brand_name: process.env.APP_NAME,
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
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
            name: "Manufacturing Services",
            description: `Quantity: ${item.quantity}`,
            unit_amount: {
              currency_code: quote.currency.toUpperCase(),
              value: item.unit_price.toString(),
            },
            quantity: item.quantity.toString(),
          })),
          custom_id: JSON.stringify({
            quote_id: quote.id,
            org_id: quote.org_id,
          }),
        },
      ],
    });

    const order = await this.paypal.execute(request);

    return {
      provider: "paypal",
      orderId: order.result.id,
      url: order.result.links.find((link) => link.rel === "approve").href,
    };
  }

  async createCheckoutSession(quoteId: string, provider: PaymentProvider = "stripe"): Promise<PaymentSessionResult> {
    try {
      const { data: quote } = await this.supabase.client
        .from("quotes")
        .select(
          `
          *,
          customer:customers (email),
          items:quote_items (
            quantity,
            unit_price,
            total_price
          )
        `,
        )
        .eq("id", quoteId)
        .single();

      if (!quote) {
        throw new QuoteNotFoundError(quoteId);
      }

      if (provider === "stripe") {
        return await this.createStripeCheckoutSession(quote);
      } else {
        return await this.createPayPalCheckoutSession(quote);
      }
    } catch (error) {
      this.logger.error("Error creating checkout session:", error);
      if (error instanceof QuoteNotFoundError) {
        throw error;
      }
      throw new PaymentProviderError(`Failed to create ${provider} checkout session`);
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleSuccessfulPayment(session);
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.handleFailedPayment(paymentIntent);
          break;
        }
      }
    } catch (err) {
      this.logger.error("Error processing webhook:", err);
      throw err;
    }
  }

  private async handleSuccessfulPayment(session: Stripe.Checkout.Session) {
    const quoteId = session.metadata.quote_id;
    const orgId = session.metadata.org_id;
    const quote = await this.getQuoteDetails(quoteId);

    const order = await this.createOrderFromQuote(quote, orgId);

    await this.supabase.client.from("payments").insert({
      order_id: order.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: quote.total_amount,
      currency: quote.currency,
      status: "succeeded",
      metadata: session,
    });

    await this.addOrderStatusHistory(order.id, "new", "Order created from successful payment", quote.created_by);

    const { data: customer } = await this.supabase.client
      .from("customers")
      .select("email")
      .eq("id", quote.customer_id)
      .single();

    await this.notify.notifyOrderCreated({
      orderId: order.id,
      customerEmail: customer.email,
    });
  }

  private async handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
    this.logger.error("Payment failed", {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      error: paymentIntent.last_payment_error?.message,
    });
  }

  async capturePayPalOrder(paypalOrderId: string) {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      request.prefer("return=representation");

      const captureResponse = await this.paypal.execute(request);
      const captureData = captureResponse.result;

      const { quote_id, org_id } = JSON.parse(captureData.purchase_units[0].custom_id);

      const quote = await this.getQuoteDetails(quote_id);
      const order = await this.createOrderFromQuote(quote, org_id);

      await this.supabase.client.from("payments").insert({
        order_id: order.id,
        paypal_order_id: paypalOrderId,
        paypal_capture_id: captureData.purchase_units[0].payments.captures[0].id,
        amount: quote.total_amount,
        currency: quote.currency,
        status: "succeeded",
        metadata: captureData,
      });

      await this.addOrderStatusHistory(
        order.id,
        "new",
        "Order created from successful PayPal payment",
        quote.created_by,
      );

      const { data: customer } = await this.supabase.client
        .from("customers")
        .select("email")
        .eq("id", quote.customer_id)
        .single();

      await this.notify.notifyOrderCreated({
        orderId: order.id,
        customerEmail: customer.email,
      });

      return {
        orderId: order.id,
        status: "succeeded",
      };
    } catch (error) {
      this.logger.error("Error capturing PayPal payment:", error);
      throw new PaymentProviderError("Failed to capture PayPal payment");
    }
  }
}
