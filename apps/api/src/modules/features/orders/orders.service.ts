import { Injectable, Optional } from "@nestjs/common";
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { NotifyService } from "../notify/notify.service";
import { QapService } from "../qap/qap.service";
import { validateOrderStatusTransition, OrderStatus } from "@cnc-quote/shared";
import { OrderResponse } from "./orders.types";

@Injectable()
export class OrdersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notify: NotifyService,
    @Optional() private readonly qapService?: QapService,
  ) {}

  // Kanban Board Methods
  async getKanbanBoard(orgId: string) {
    const { data: orders } = await this.supabase.client
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        priority,
        total_amount,
        currency,
        created_at,
        updated_at,
        customer:customers (
          id,
          name,
          email
        ),
        items:order_items (
          id,
          quantity,
          status
        ),
        _count:order_items(count)
      `)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    // Group orders by status for kanban lanes
    const kanbanData = {
      draft: orders?.filter(order => order.status === 'draft') || [],
      pending_approval: orders?.filter(order => order.status === 'pending_approval') || [],
      approved: orders?.filter(order => order.status === 'approved') || [],
      in_production: orders?.filter(order => order.status === 'in_production') || [],
      quality_check: orders?.filter(order => order.status === 'quality_check') || [],
      shipping: orders?.filter(order => order.status === 'shipping') || [],
      completed: orders?.filter(order => order.status === 'completed') || [],
      cancelled: orders?.filter(order => order.status === 'cancelled') || [],
    };

    return kanbanData;
  }

  async updateOrderStatus(orderId: string, status: string, userId: string, notes?: string) {
    // Fetch current status for validation
    const { data: existing } = await this.supabase.client
      .from("orders")
      .select("id,status,total_amount,currency")
      .eq("id", orderId)
      .single();

    if (!existing) {
      throw new Error("Order not found");
    }

    const canonicalFrom = this.mapDbStatusToCanonical(existing.status);
    const canonicalTo = this.normalizeIncomingStatus(status);

    const validation = validateOrderStatusTransition(canonicalFrom, canonicalTo);
    if (!validation.allowed) {
      throw new Error(validation.reason || "Invalid order status transition");
    }

    const dbStatus = this.mapCanonicalToDbStatus(canonicalTo);

    const { data: updated } = await this.supabase.client
      .from("orders")
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    if (!updated) {
      throw new Error("Failed to update order status");
    }

    await this.addOrderStatusHistory(orderId, dbStatus, notes || `Order status updated to ${dbStatus}` , userId);

    await this.notify.sendOrderNotification({
      type: "order_status_changed",
      orderId,
      status: dbStatus,
      amount: updated.total_amount,
      currency: updated.currency,
    });

    return updated;
  }

  async moveOrderInKanban(orderId: string, newStatus: string, userId: string) {
    return this.updateOrderStatus(orderId, newStatus, userId, `Moved to ${newStatus} in kanban board`);
  }

  // Order Details Methods
  async getOrderDetails(orderId: string) {
    const { data: order } = await this.supabase.client
      .from("orders")
      .select(
        `
        *,
        customer:customers (
          id,
          name,
          email,
          company
        ),
        items:order_items (
          *,
          quote_item:quote_items (
            *,
            material:materials (*),
            file:files (*)
          )
        ),
        status_history:order_status_history (
          id,
          new_status,
          notes,
          changed_by,
          created_at,
          user:users (
            id,
            name,
            email
          )
        ),
        payments (
          id,
          amount,
          currency,
          status,
          payment_method,
          created_at
        ),
        shipments (
          id,
          tracking_number,
          carrier,
          status,
          shipped_at,
          delivered_at,
          created_at
        ),
        work_orders (
          id,
          work_order_number,
          status,
          assigned_to,
          priority,
          due_date,
          created_at,
          assigned_user:users (
            id,
            name,
            email
          )
        ),
        qap_documents:qap_documents (
          id,
          document_number,
          status,
          template:qap_templates (
            name,
            version
          ),
          created_at
        ),
        documents:order_documents (
          id,
          name,
          type,
          url,
          uploaded_by,
          created_at,
          uploader:users (
            id,
            name,
            email
          )
        )
      `,
      )
      .eq("id", orderId)
      .single();

    return order;
  }

  // Work Order Management
  async createWorkOrder(orderId: string, workOrderData: any, userId: string) {
    const { data: workOrder } = await this.supabase.client
      .from("work_orders")
      .insert({
        ...workOrderData,
        order_id: orderId,
        created_by: userId,
      })
      .select()
      .single();

    // Update order status if needed
    await this.updateOrderStatus(orderId, 'in_production', userId, 'Work order created');

    return workOrder;
  }

  async updateWorkOrder(workOrderId: string, updates: any, userId: string) {
    const { data: workOrder } = await this.supabase.client
      .from("work_orders")
      .update({ ...updates, updated_by: userId })
      .eq("id", workOrderId)
      .select()
      .single();

    return workOrder;
  }

  async assignWorkOrder(workOrderId: string, assignedTo: string, userId: string) {
    return this.updateWorkOrder(workOrderId, { assigned_to: assignedTo }, userId);
  }

  // QAP Document Management
  async getOrderQapDocuments(orderId: string) {
    const { data: qapDocs } = await this.supabase.client
      .from("qap_documents")
      .select(`
        *,
        template:qap_templates (
          name,
          version,
          process_type
        ),
        order_item:order_items (
          id,
          quantity,
          quote_item:quote_items (
            file:files (
              name
            ),
            material:materials (
              name
            )
          )
        )
      `)
      .eq("order_id", orderId);

    return qapDocs || [];
  }

  async updateQapDocument(qapId: string, updates: any, userId: string) {
    const { data: qapDoc } = await this.supabase.client
      .from("qap_documents")
      .update({ ...updates, updated_by: userId })
      .eq("id", qapId)
      .select()
      .single();

    return qapDoc;
  }

  // Document Management
  async uploadOrderDocument(orderId: string, documentData: any, userId: string) {
    const { data: document } = await this.supabase.client
      .from("order_documents")
      .insert({
        ...documentData,
        order_id: orderId,
        uploaded_by: userId,
      })
      .select()
      .single();

    return document;
  }

  async getOrderDocuments(orderId: string) {
    const { data: documents } = await this.supabase.client
      .from("order_documents")
      .select(`
        *,
        uploader:users (
          id,
          name,
          email
        )
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    return documents || [];
  }

  async deleteOrderDocument(documentId: string, userId: string) {
    // Soft delete could be implemented; for now perform hard delete
    const { error } = await this.supabase.client
      .from("order_documents")
      .delete()
      .eq("id", documentId);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }

    // Optional: add history note (attempt to resolve order id first)
    try {
      const { data: doc } = await this.supabase.client
        .from("order_documents")
        .select("order_id")
        .eq("id", documentId)
        .maybeSingle();
      if (doc?.order_id) {
        await this.addOrderStatusHistory(doc.order_id, null, `Order document ${documentId} deleted`, userId);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug?.("Non-critical: failed to append deletion note", e);
    }

    return { success: true };
  }

  // Shipment Management
  async createShipment(orderId: string, shipmentData: any, userId: string) {
    const { data: shipment } = await this.supabase.client
      .from("shipments")
      .insert({
        ...shipmentData,
        order_id: orderId,
        created_by: userId,
      })
      .select()
      .single();

    // Update order status to shipping
    await this.updateOrderStatus(orderId, 'shipping', userId, 'Shipment created');

    return shipment;
  }

  async updateShipment(shipmentId: string, updates: any, userId: string) {
    const { data: shipment } = await this.supabase.client
      .from("shipments")
      .update({ ...updates, updated_by: userId })
      .eq("id", shipmentId)
      .select()
      .single();

    // Update order status based on shipment status
    if (updates.status === 'delivered') {
      const { data: shipmentData } = await this.supabase.client
        .from("shipments")
        .select("order_id")
        .eq("id", shipmentId)
        .single();

      if (shipmentData) {
        await this.updateOrderStatus(shipmentData.order_id, 'completed', userId, 'Shipment delivered');
      }
    }

    return shipment;
  }

  async getOrderShipments(orderId: string) {
    const { data: shipments } = await this.supabase.client
      .from("shipments")
      .select(`
        *,
        creator:users (
          id,
          name,
          email
        )
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    return shipments || [];
  }

  // Priority Management
  async updateOrderPriority(orderId: string, priority: string, userId: string) {
    const { data: order } = await this.supabase.client
      .from("orders")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    if (!order) {
      throw new Error("Order not found");
    }

    await this.addOrderStatusHistory(orderId, order.status, `Priority updated to ${priority}`, userId);

    return order;
  }

  // Search and Filtering
  async searchOrders(orgId: string, filters: any) {
    let query = this.supabase.client
      .from("orders")
      .select(`
        *,
        customer:customers (
          id,
          name,
          email
        ),
        items:order_items (
          id,
          quantity,
          status
        )
      `)
      .eq("org_id", orgId);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }

    if (filters.customerId) {
      query = query.eq("customer_id", filters.customerId);
    }

    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    if (filters.search) {
      query = query.or(`order_number.ilike.%${filters.search}%,customer.name.ilike.%${filters.search}%`);
    }

    const { data: orders } = await query.order("created_at", { ascending: false });

    return orders || [];
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

  async getOrderTimeline(orderId: string) {
    // Core order with status history & payments summary (leaner than full details)
    const { data: order } = await this.supabase.client
      .from("orders")
      .select(
        `id, order_number, status, created_at, updated_at,
         status_history:order_status_history(id,new_status,notes,changed_by,created_at),
         payments(id,amount,currency,status,created_at)`
      )
      .eq("id", orderId)
      .single();

    if (!order) return null;

    // Map statuses to canonical for response (without changing DB layer yet)
    const canonicalStatus = this.mapDbStatusToCanonical(order.status);
    const history = (order.status_history || []).map((h: any) => ({
      ...h,
      new_status: this.mapDbStatusToCanonical(h.new_status),
    }));

    return {
      id: order.id,
      order_number: order.order_number,
      status: canonicalStatus,
      created_at: order.created_at,
      updated_at: order.updated_at,
      status_history: history,
      payments: order.payments || [],
    };
  }

  // --- Status Mapping & Validation Helpers ---
  private mapDbStatusToCanonical(dbStatus: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      draft: 'NEW',
      pending_approval: 'NEW',
      approved: 'PAID',
      in_production: 'IN_PRODUCTION',
      quality_check: 'QC',
      shipping: 'SHIPPED',
      completed: 'COMPLETE',
      cancelled: 'CANCELLED',
      // Already canonical (if stored uppercase for some reason)
      NEW: 'NEW',
      PAID: 'PAID',
      IN_PRODUCTION: 'IN_PRODUCTION',
      QC: 'QC',
      SHIPPED: 'SHIPPED',
      COMPLETE: 'COMPLETE',
      CANCELLED: 'CANCELLED',
    };
    return map[dbStatus] || 'NEW';
  }

  private mapCanonicalToDbStatus(status: OrderStatus): string {
    const reverse: Record<OrderStatus, string> = {
      NEW: 'draft',
      PAID: 'approved',
      IN_PRODUCTION: 'in_production',
      QC: 'quality_check',
      SHIPPED: 'shipping',
      COMPLETE: 'completed',
      CANCELLED: 'cancelled',
    };
    return reverse[status];
  }

  private normalizeIncomingStatus(input: string): OrderStatus {
    const upper = (input || '').toUpperCase();
    // Accept either canonical or legacy db status names
    const direct = [
      'NEW','PAID','IN_PRODUCTION','QC','SHIPPED','COMPLETE','CANCELLED'
    ];
    if (direct.includes(upper)) return upper as OrderStatus;
    const legacyMap: Record<string, OrderStatus> = {
      DRAFT: 'NEW',
      PENDING_APPROVAL: 'NEW',
      APPROVED: 'PAID',
      IN_PRODUCTION: 'IN_PRODUCTION',
      QUALITY_CHECK: 'QC',
      SHIPPING: 'SHIPPED',
      COMPLETED: 'COMPLETE',
      CANCELLED: 'CANCELLED',
    };
    return legacyMap[upper] || 'NEW';
  }

  // Centralized history writer (newStatus can be null for non-status notes)
  private async addOrderStatusHistory(orderId: string, newStatus: string | null, notes: string, userId: string) {
    await this.supabase.client.from("order_status_history").insert({
      order_id: orderId,
      new_status: newStatus,
      notes,
      changed_by: userId,
    });
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

  private async generateOrderQapDocuments(order: OrderResponse, userId: string) {
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
        const quoteItem = orderDetails.quote.items.find((qi: { id: string }) => qi.id === item.quote_item_id);

        if (!quoteItem) continue;

  // Use first matching template for now
  // NOTE: Future enhancement: select template based on material/complexity criteria
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

        // Generate QAP document (skip if QapService not available)
        if (this.qapService) {
          await this.qapService.generateQapDocument({
            templateId: template.id,
            orderId: order.id,
            orderItemId: item.id,
            orgId: order.org_id,
            userId,
            documentData: qapData,
          });
        }
      }
    } catch (error) {
      console.error("Error generating QAP documents:", error);
    }
  }
}
