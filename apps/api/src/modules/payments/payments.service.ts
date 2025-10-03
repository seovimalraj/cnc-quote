import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { NotifyService } from "../notify/notify.service";
import { OrdersService } from "../orders/orders.service";
import * as paypalServerSDK from "@paypal/paypal-server-sdk";
import { PaymentSessionResult } from "./payments.types";
import { Quote } from "./payments.types.quotes";
import { PaymentProviderError, QuoteNotFoundError } from "./payments.errors";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paypal: paypalServerSDK.Client;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notify: NotifyService,
    private readonly ordersService: OrdersService,
  ) {
    const environment = process.env.NODE_ENV === "production"
      ? paypalServerSDK.Environment.Production
      : paypalServerSDK.Environment.Sandbox;

    this.paypal = new paypalServerSDK.Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
      },
      environment,
    });
  }

  private async getQuoteDetails(quoteId: string): Promise<Quote> {
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

  private async createOrderFromQuote(quote: Quote, orgId: string) {
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

  // Deprecated local helper kept temporarily for backward compatibility (use OrdersService.updateOrderStatus)
  private async addOrderStatusHistory(orderId: string, status: string, notes: string, changedBy: string) {
    await this.supabase.client.from("order_status_history").insert({
      order_id: orderId,
      new_status: status,
      notes,
      changed_by: changedBy,
    });
  }

  private async createPayPalCheckoutSession(quote: Quote): Promise<PaymentSessionResult> {
    const ordersController = new paypalServerSDK.OrdersController(this.paypal);
    
    const orderRequest = {
      body: {
        intent: paypalServerSDK.CheckoutPaymentIntent.Capture,
        applicationContext: {
          returnUrl: `${process.env.APP_URL}/portal/checkout/${quote.id}/result/success`,
          cancelUrl: `${process.env.APP_URL}/portal/checkout/${quote.id}/result/cancel`,
          brandName: process.env.APP_NAME,
          landingPage: paypalServerSDK.OrderApplicationContextLandingPage.Login,
          userAction: paypalServerSDK.OrderApplicationContextUserAction.PayNow,
        },
        purchaseUnits: [
          {
            amount: {
              currencyCode: quote.currency.toUpperCase(),
              value: quote.total_amount.toString(),
              breakdown: {
                itemTotal: {
                  currencyCode: quote.currency.toUpperCase(),
                  value: quote.total_amount.toString(),
                },
              },
            },
            items: quote.items.map((item) => ({
              name: "Manufacturing Services",
              description: `Quantity: ${item.quantity}`,
              unitAmount: {
                currencyCode: quote.currency.toUpperCase(),
                value: item.unit_price.toString(),
              },
              quantity: item.quantity.toString(),
            })),
            customId: JSON.stringify({
              quote_id: quote.id,
              org_id: quote.org_id,
            }),
          },
        ],
      },
    };

    const { result } = await ordersController.createOrder(orderRequest);

    return {
      provider: "paypal",
      orderId: result.id,
      url: result.links.find((link) => link.rel === "approve").href,
    };
  }

  async createCheckoutSession(quoteId: string): Promise<PaymentSessionResult> {
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

      return await this.createPayPalCheckoutSession(quote);
    } catch (error) {
      this.logger.error("Error creating checkout session:", error);
      if (error instanceof QuoteNotFoundError) {
        throw error;
      }
      throw new PaymentProviderError("Failed to create PayPal checkout session");
    }
  }

  async capturePayPalOrder(paypalOrderId: string) {
    try {
      const ordersController = new paypalServerSDK.OrdersController(this.paypal);
      
      const captureRequest = {
        id: paypalOrderId,
      };

  const { result } = await ordersController.captureOrder(captureRequest);
  const captureData = result;

      const { quote_id, org_id } = JSON.parse(captureData.purchaseUnits[0].customId);

      // Idempotency: check if payment already recorded
      const { data: existingPayment } = await this.supabase.client
        .from("payments")
        .select("id, order_id")
        .eq("paypal_order_id", paypalOrderId)
        .maybeSingle();

      let orderId: string;
      let orderCreated = false;
      let capturedQuote: Quote | null = null;

      if (existingPayment) {
        orderId = existingPayment.order_id;
      } else {
        const quote = await this.getQuoteDetails(quote_id);
        capturedQuote = quote;
        const order = await this.createOrderFromQuote(quote, org_id);
        orderId = order.id;
        orderCreated = true;

        const statusActor = quote.created_by ?? "system";

        // Record payment
        await this.supabase.client.from("payments").insert({
          order_id: order.id,
          paypal_order_id: paypalOrderId,
          paypal_capture_id: captureData.purchaseUnits[0].payments.captures[0].id,
          amount: quote.total_amount,
          currency: quote.currency,
          status: "succeeded",
          metadata: captureData,
        });

        // Record status transitions via OrdersService to enforce validation & history
        try {
          // Ensure starting state (if DB inserted as 'new' lowercase map to canonical NEW)
          await this.ordersService.updateOrderStatus(order.id, "NEW", statusActor, "Order created from successful PayPal payment");
          await this.ordersService.updateOrderStatus(order.id, "PAID", statusActor, "Payment captured (PayPal)");
        } catch (statusErr) {
          this.logger.warn(`Order status update via OrdersService failed, falling back direct: ${(statusErr as Error).message}`);
          // Fallback direct updates (should rarely trigger)
          await this.addOrderStatusHistory(order.id, "new", "Order created from successful PayPal payment", statusActor);
          await this.addOrderStatusHistory(order.id, "paid", "Payment captured (PayPal)", statusActor);
          await this.supabase.client.from("orders").update({ status: "paid" }).eq("id", order.id);
        }

        // Update quote status if still open
        await this.supabase.client
          .from("quotes")
          .update({ status: "Ordered" })
          .eq("id", quote.id)
          .eq("status", quote.status); // prevent overriding progress if changed

        // Analytics event stub (assuming analytics_events table exists)
        try {
          await this.supabase.client.from("analytics_events").insert({
            event_type: "payment_captured",
            quote_id,
            organization_id: org_id,
            properties: {
              provider: "paypal",
              paypal_order_id: paypalOrderId,
              capture_id: captureData.purchaseUnits[0].payments.captures[0].id,
              amount: quote.total_amount,
              currency: quote.currency,
            },
            created_at: new Date().toISOString(),
          });
        } catch (analyticsError) {
          this.logger.debug(`Analytics insert failed (non-fatal): ${ (analyticsError as Error).message }`);
        }
      }

      let customerEmail: string | undefined;
      if (capturedQuote) {
        const { data: customer } = await this.supabase.client
          .from("customers")
          .select("email")
          .eq("id", capturedQuote.customer_id)
          .single();
        customerEmail = customer?.email;
      }
      if (orderCreated) {
        // Notify only on first creation
        await this.notify.notifyOrderCreated({
          orderId,
          customerEmail,
        });
      }

      return {
        orderId,
        status: "succeeded",
      };
    } catch (error) {
      this.logger.error("Error capturing PayPal payment:", error);
      throw new PaymentProviderError("Failed to capture PayPal payment");
    }
  }
}
