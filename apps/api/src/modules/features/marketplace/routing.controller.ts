/**
 * Step 17: Routing Controller
 * REST API for routing candidates and order assignment
 */

import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoutingService } from './routing.service';
import type {
  GetCandidatesDto,
  AssignSupplierDto,
  CreateRoutingRuleDto,
} from '@cnc-quote/shared/marketplace';

// TODO: Import actual guards
// import { RbacGuard } from "../../core/auth/auth/rbac.guard";
// import { RequirePermissions } from "../../core/auth/auth/permissions.decorator";

@Controller('routing')
// @UseGuards(RbacGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  /**
   * POST /routing/candidates
   * Get ranked candidate list for an order
   */
  @Post('candidates')
  // @RequirePermissions('orders:assign_supplier')
  @HttpCode(HttpStatus.OK)
  async getCandidates(@Body() dto: GetCandidatesDto, @Req() req: any) {
    const orgId = req.user?.org_id || req.user?.orgId;
    return this.routingService.getCandidates(orgId, dto);
  }

  /**
   * POST /routing/rules
   * Create a routing rule
   */
  @Post('rules')
  // @RequirePermissions('routingRules:write')
  @HttpCode(HttpStatus.CREATED)
  async createRule(@Body() dto: CreateRoutingRuleDto, @Req() req: any) {
    const orgId = req.user?.org_id || req.user?.orgId;
    const userId = req.user?.id;

    return this.routingService.createRule(orgId, userId, dto);
  }
}

@Controller('orders')
// @UseGuards(RbacGuard)
export class OrdersRoutingController {
  constructor(private readonly routingService: RoutingService) {}

  /**
   * POST /orders/:id/assign_supplier
   * Assign supplier to an order
   */
  @Post(':id/assign_supplier')
  // @RequirePermissions('orders:assign_supplier')
  @HttpCode(HttpStatus.OK)
  async assignSupplier(
    @Param('id') orderId: string,
    @Body() dto: AssignSupplierDto,
    @Req() req: any,
  ) {
    const orgId = req.user?.org_id || req.user?.orgId;
    const userId = req.user?.id;

    return this.routingService.assignSupplier(orgId, userId, orderId, dto);
  }
}
