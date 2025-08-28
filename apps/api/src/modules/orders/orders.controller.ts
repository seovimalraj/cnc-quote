import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from '../../auth/org.guard';
import { ReqUser } from '../../auth/req-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':orderId')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.getOrder(orderId);
  }

  @Get('org/:orgId')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async getOrders(@Param('orgId') orgId: string) {
    return this.ordersService.getOrders(orgId);
  }

  @Post(':orderId/status')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: string,
    @Body('notes') notes: string,
    @ReqUser() user: any,
  ) {
    return this.ordersService.updateOrderStatus(orderId, status, user.id, notes);
  }
}
