import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { NotifyService } from "../notify/notify.service";
import { QapService } from "../qap/qap.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notify: NotifyService,
    private readonly qapService: QapService,
  ) {}

  async updateOrderStatus(orderId: string, status: string, userId: string, notes?: string) {
    // Update order status
    const { data: order } = await this.supabase.client
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (!order) {
      throw new Error("Order not found");
    }

    // Add status history
    await this.supabase.client.from("order_status_history").insert({
      order_id: orderId,
      new_status: status,
      notes: notes || `Order status updated to ${status}`,
      changed_by: userId,
    });

    // Send notifications
    await this.notify.sendOrderNotification({
      type: "order_created",
      orderId,
      amount: order.total_amount,
      currency: order.currency,
    });

    return order;
  }

  async getOrder(orderId: string) {
    const { data: order } = await this.supabase.client
      .from("orders")
      .select(
        `
        *,
        customer:customers (
          id,
          name,
          email
        ),
        items:order_items (
          *,
          quote_item:quote_items (
            *,
            material:materials (*)
          )
        ),
        status_history:order_status_history (
          id,
          new_status,
          notes,
          changed_by,
          created_at
        ),
        payments (
          id,
          amount,
          currency,
          status,
          created_at
        ),
        shipments (
          id,
          tracking_number,
          carrier,
          status,
          created_at
        )
      `,
      )
      .eq("id", orderId)
      .single();

    return order;
  }

  async getOrders(orgId: string) {
    const { data: orders } = await this.supabase.client
      .from("orders")
      .select(
        `
        *,
        customer:customers (
          id,
          name,
          email
        ),
        items:order_items (
          id,
          quantity,
          unit_price,
          total_price,
          status
        )
      `,
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    return orders || [];
  }

  private async generateOrderQapDocuments(order: any, userId: string) {
    try {
      // Get order details with quote and items
      const { data: orderDetails } = await this.supabase.client
        .from("orders")
        .select(
          `
          *,
          quote:quotes (
            process_type,
            items:quote_items (
              *,
              file:files (*),
              material:materials (*)
            )
          ),
          items:order_items (*)
        `,
        )
        .eq("id", order.id)
        .single();

      if (!orderDetails) return;

      // Get QAP templates for the process type
      const { data: templates } = await this.supabase.client
        .from("qap_templates")
        .select()
        .eq("org_id", order.org_id)
        .eq("process_type", orderDetails.quote.process_type);

      if (!templates?.length) return;

      // Generate QAP for each order item using the appropriate template
      for (const item of orderDetails.items) {
        const quoteItem = orderDetails.quote.items.find((qi: any) => qi.id === item.quote_item_id);

        if (!quoteItem) continue;

        // Use first matching template for now
        // TODO: Add template selection logic based on material/complexity
        const template = templates[0];

        // Prepare QAP data
        const qapData = {
          part: {
            name: quoteItem.file.name,
            material: quoteItem.material.name,
            quantity: item.quantity,
          },
          measurements: [],
          inspection: {
            inspector: "",
            date: new Date().toISOString().split("T")[0],
            result: "PENDING",
          },
        };

        // Generate QAP document
        await this.qapService.generateQapDocument({
          templateId: template.id,
          orderId: order.id,
          orderItemId: item.id,
          orgId: order.org_id,
          userId,
          documentData: qapData,
        });
      }
    } catch (error) {
      console.error("Error generating QAP documents:", error);
    }
  }
}
