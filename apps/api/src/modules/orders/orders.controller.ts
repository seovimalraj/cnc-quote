import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { OrdersService } from "./orders.service";
import { AuthGuard } from "@nestjs/passport";
import { OrgGuard } from "../../auth/org.guard";
import { ReqUser } from "../../auth/req-user.decorator";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Kanban Board Endpoints
  @Get("kanban/:orgId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async getKanbanBoard(@Param("orgId") orgId: string) {
    return this.ordersService.getKanbanBoard(orgId);
  }

  @Post(":orderId/move")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async moveOrderInKanban(
    @Param("orderId") orderId: string,
    @Body("status") status: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.moveOrderInKanban(orderId, status, user.id);
  }

  // Order Details Endpoints
  @Get("details/:orderId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async getOrderDetails(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderDetails(orderId);
  }

  @Patch(":orderId/priority")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async updateOrderPriority(
    @Param("orderId") orderId: string,
    @Body("priority") priority: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateOrderPriority(orderId, priority, user.id);
  }

  // Work Order Endpoints
  @Post(":orderId/work-orders")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async createWorkOrder(
    @Param("orderId") orderId: string,
    @Body() workOrderData: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.createWorkOrder(orderId, workOrderData, user.id);
  }

  @Put("work-orders/:workOrderId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async updateWorkOrder(
    @Param("workOrderId") workOrderId: string,
    @Body() updates: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateWorkOrder(workOrderId, updates, user.id);
  }

  @Post("work-orders/:workOrderId/assign")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async assignWorkOrder(
    @Param("workOrderId") workOrderId: string,
    @Body("assignedTo") assignedTo: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.assignWorkOrder(workOrderId, assignedTo, user.id);
  }

  // QAP Document Endpoints
  @Get(":orderId/qap")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async getOrderQapDocuments(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderQapDocuments(orderId);
  }

  @Put("qap/:qapId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async updateQapDocument(
    @Param("qapId") qapId: string,
    @Body() updates: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateQapDocument(qapId, updates, user.id);
  }

  // Document Management Endpoints
  @Post(":orderId/documents")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
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
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async getOrderDocuments(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderDocuments(orderId);
  }

  @Delete("documents/:documentId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async deleteOrderDocument(@Param("documentId") documentId: string) {
    // TODO: Implement document deletion
    return { success: true };
  }

  // Shipment Endpoints
  @Post(":orderId/shipments")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async createShipment(
    @Param("orderId") orderId: string,
    @Body() shipmentData: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.createShipment(orderId, shipmentData, user.id);
  }

  @Put("shipments/:shipmentId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async updateShipment(
    @Param("shipmentId") shipmentId: string,
    @Body() updates: any,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateShipment(shipmentId, updates, user.id);
  }

  @Get(":orderId/shipments")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async getOrderShipments(@Param("orderId") orderId: string) {
    return this.ordersService.getOrderShipments(orderId);
  }

  // Search and Filtering Endpoints
  @Get("search/:orgId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async searchOrders(
    @Param("orgId") orgId: string,
    @Query() filters: any,
  ) {
    return this.ordersService.searchOrders(orgId, filters);
  }

  // Legacy Endpoints (keeping for compatibility)
  @Get(":orderId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async getOrder(@Param("orderId") orderId: string) {
    return this.ordersService.getOrder(orderId);
  }

  @Get("org/:orgId")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async getOrders(@Param("orgId") orgId: string) {
    return this.ordersService.getOrders(orgId);
  }

  @Post(":orderId/status")
  @UseGuards(AuthGuard("jwt"), OrgGuard)
  async updateOrderStatus(
    @Param("orderId") orderId: string,
    @Body("status") status: string,
    @Body("notes") notes: string,
    @ReqUser() user: { id: string },
  ) {
    return this.ordersService.updateOrderStatus(orderId, status, user.id, notes);
  }
}
