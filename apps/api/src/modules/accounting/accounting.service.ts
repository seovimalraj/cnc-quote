import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SupabaseService } from "../../lib/supabase/supabase.service";

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private readonly supabase: SupabaseService) {}

  @Cron("0 0 * * *") // Run at midnight daily
  async syncPaymentsToZohoBooks() {
    if (!process.env.ZOHO_BOOKS_TOKEN) {
      this.logger.log("ZOHO_BOOKS_TOKEN not configured, skipping sync");
      return;
    }

    try {
      // Get all orders with payments from last 24h that need syncing
      const { data: orders, error } = await this.supabase.client
        .from("orders")
        .select("id, amount, payment_id, customer:users(name, email), created_at")
        .eq("zoho_invoice_id", null) // Not yet synced
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not("payment_id", "is", null);

      if (error) throw error;

      for (const order of orders) {
        try {
          const invoice = await this.createZohoInvoice({
            customerId: order.customer[0]?.id || order.customer.id,
            customerName: order.customer[0]?.name || order.customer.name,
            customerEmail: order.customer[0]?.email || order.customer.email,
            orderId: order.id,
            amount: order.amount,
            date: order.created_at,
          });

          // Update order with Zoho invoice ID
          await this.supabase.client.from("orders").update({ zoho_invoice_id: invoice.invoice_id }).eq("id", order.id);

          this.logger.log(`Created Zoho invoice ${invoice.invoice_id} for order ${order.id}`);
        } catch (err) {
          this.logger.error(`Failed to sync order ${order.id} to Zoho Books`, err);
        }
      }
    } catch (err) {
      this.logger.error("Failed to run Zoho Books sync", err);
    }
  }

  private async createZohoInvoice(params: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    orderId: string;
    amount: number;
    date: string;
  }) {
    // Make Zoho Books API call to create invoice
    const response = await fetch("https://books.zoho.com/api/v3/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ZOHO_BOOKS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_name: params.customerName,
        email: params.customerEmail,
        date: params.date,
        line_items: [
          {
            name: `Order ${params.orderId}`,
            quantity: 1,
            rate: params.amount,
          },
        ],
        payment_terms: 0, // Due immediately
        payment_terms_label: "Due on receipt",
        is_inclusive_tax: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Zoho Books API error: ${response.statusText}`);
    }

    return response.json();
  }
}
