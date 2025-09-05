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
    // Update order status
    const { data: order } = await this.supabase.client
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
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
      type: "order_status_changed",
      orderId,
      status,
      amount: order.total_amount,
      currency: order.currency,
    });

    return order;
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

    // Add to status history
    await this.supabase.client.from("order_status_history").insert({
      order_id: orderId,
      new_status: order.status,
      notes: `Priority updated to ${priority}`,
      changed_by: userId,
    });

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
