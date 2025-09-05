import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminHealthService, HealthStatus, MetricPoint, HeatmapCell } from './admin-health.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('admin/health')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'ops')
export class AdminHealthController {
  constructor(private readonly adminHealthService: AdminHealthService) {}

  @Get('api')
  async getApiHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getApiHealth();
  }

  @Get('cad')
  async getCadHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getCadHealth();
  }

  @Get('queues')
  async getQueuesHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getQueuesHealth();
  }

  @Get('db')
  async getDbHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getDbHealth();
  }

  @Get('stripe')
  async getStripeHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getStripeHealth();
  }

  @Get('paypal')
  async getPaypalHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getPaypalHealth();
  }

  @Get('storage')
  async getStorageHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getStorageHealth();
  }

  @Get('widget-origins')
  async getWidgetOriginsHealth(): Promise<HealthStatus> {
    return this.adminHealthService.getWidgetOriginsHealth();
  }
}
