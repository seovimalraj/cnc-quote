import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { OrdersService } from "./orders.service";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { PoliciesGuard } from "../../auth/policies.guard";
import { Policies } from "../../auth/policies.decorator";
import { ReqUser } from "../../auth/req-user.decorator";

@Controller("orders")
@UseGuards(JwtAuthGuard, OrgGuard, PoliciesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Kanban Board Endpoints
  @Get("kanban/:orgId")
  @Policies({ action: 'view', resource: 'orders' })
  async getKanbanBoard(@Param("orgId") orgId: string) {
    return this.ordersService.getKanbanBoard(orgId);
  }

  @Post(":orderId/move")
  @Policies({ action: 'update', resource: 'orders' })
  async moveOrderInKanban(
    @Param("orderId") orderId: string,
    @Body("status") status: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.moveOrderInKanban(orderId, status, user.id);
  }

  // Order Details Endpoints
  @Get("details/:orderId")
  @Policies({ action: 'view', resource: 'orders' })
  async getOrderDetails(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderDetails(orderId);
  }

  @Patch(":orderId/priority")
  @Policies({ action: 'update', resource: 'orders' })
  async updateOrderPriority(
    @Param("orderId") orderId: string,
    @Body("priority") priority: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateOrderPriority(orderId, priority, user.id);
  }

  // Work Order Endpoints
  @Post(":orderId/work-orders")
  @Policies({ action: 'create', resource: 'work_orders' })
  async createWorkOrder(
    @Param("orderId") orderId: string,
    @Body() workOrderData: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.createWorkOrder(orderId, workOrderData, user.id);
  }

  @Put("work-orders/:workOrderId")
  @Policies({ action: 'update', resource: 'work_orders' })
  async updateWorkOrder(
    @Param("workOrderId") workOrderId: string,
    @Body() updates: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateWorkOrder(workOrderId, updates, user.id);
  }

  @Post("work-orders/:workOrderId/assign")
  @Policies({ action: 'update', resource: 'work_orders' })
  async assignWorkOrder(
    @Param("workOrderId") workOrderId: string,
    @Body("assignedTo") assignedTo: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.assignWorkOrder(workOrderId, assignedTo, user.id);
  }

  // QAP Document Endpoints
  @Get(":orderId/qap")
  @Policies({ action: 'view', resource: 'qap' })
  async getOrderQapDocuments(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderQapDocuments(orderId);
  }

  @Put("qap/:qapId")
  @Policies({ action: 'update', resource: 'qap' })
  async updateQapDocument(
    @Param("qapId") qapId: string,
    @Body() updates: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateQapDocument(qapId, updates, user.id);
  }

  // Document Management Endpoints
  @Post(":orderId/documents")
  @Policies({ action: 'upload', resource: 'documents' })
  @UseInterceptors(FileInterceptor("file"))
  async uploadOrderDocument(
    @Param("orderId") orderId: string,
    @UploadedFile() file: any,
    @Body() documentData: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.uploadOrderDocument(orderId, {
      ...documentData,
      file,
    }, user.id);
  }

  @Get(":orderId/documents")
  @Policies({ action: 'view', resource: 'documents' })
  async getOrderDocuments(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderDocuments(orderId);
  }

  @Delete("documents/:documentId")
  @Policies({ action: 'delete', resource: 'documents' })
  async deleteOrderDocument(
    @Param("documentId") documentId: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.deleteOrderDocument(documentId, user.id);
  }

  // Shipment Endpoints
  @Post(":orderId/shipments")
  @Policies({ action: 'create', resource: 'shipments' })
  async createShipment(
    @Param("orderId") orderId: string,
    @Body() shipmentData: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.createShipment(orderId, shipmentData, user.id);
  }

  @Put("shipments/:shipmentId")
  @Policies({ action: 'update', resource: 'shipments' })
  async updateShipment(
    @Param("shipmentId") shipmentId: string,
    @Body() updates: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateShipment(shipmentId, updates, user.id);
  }

  @Get(":orderId/shipments")
  @Policies({ action: 'view', resource: 'shipments' })
  async getOrderShipments(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderShipments(orderId);
  }

  // Search and Filtering Endpoints
  @Get("search/:orgId")
  @Policies({ action: 'view', resource: 'orders' })
  async searchOrders(
    @Param("orgId") orgId: string,
    @Query() filters: any,
  ) {
    return this.ordersService.searchOrders(orgId, filters);
  }

  // Legacy Endpoints (keeping for compatibility)
  @Get(":orderId")
  @Policies({ action: 'view', resource: 'orders' })
  async getOrder(@Param("orderId") orderId: string) {
    return this.ordersService.getOrder(orderId);
  }

  // Order Timeline (lean status/payment history) endpoint
  @Get(":orderId/timeline")
  @Policies({ action: 'view', resource: 'orders' })
  async getOrderTimeline(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderTimeline(orderId);
  }

  @Get("org/:orgId")
  @Policies({ action: 'view', resource: 'orders' })
  async getOrders(@Param("orgId") orgId: string) {
    return this.ordersService.getOrders(orgId);
  }

  @Post(":orderId/status")
  @Policies({ action: 'update', resource: 'orders' })
  async updateOrderStatus(
    @Param("orderId") orderId: string,
    @Body("status") status: string,
    @Body("notes") notes: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateOrderStatus(orderId, status, user.id, notes);
  }

  // Customer list endpoint: minimal filtered list (org + optional status + customerId)
  @Get("customer/:orgId")
  @Policies({ action: 'view', resource: 'orders' })
  async getCustomerOrders(
    @Param("orgId") orgId: string,
    @Query("customerId") customerId?: string,
    @Query("status") status?: string,
  ) {
    return this.ordersService.searchOrders(orgId, { customerId, status });
  }
}
