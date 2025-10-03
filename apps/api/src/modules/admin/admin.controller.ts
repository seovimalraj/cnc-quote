import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { AdminService } from "./admin.service";

@ApiTags("Admin Dashboard")
@Controller("admin")
@UseGuards(JwtAuthGuard, OrgGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("review/summary")
  async getReviewSummary(@Query('window') window: string = '1h') {
    return this.adminService.getReviewSummary(window);
  }

  @Get("metrics/db")
  async getDatabaseMetrics(@Query('window') window: string = '1h') {
    return this.adminService.getDatabaseMetrics(window);
  }

  @Get("webhooks/status")
  async getWebhookStatus(@Query('window') window: string = '1h') {
    return this.adminService.getWebhookStatus(window);
  }

  @Post("webhooks/stripe/replay")
  async replayStripeWebhooks(@Query('window') window: string = '24h') {
    return this.adminService.replayWebhooks('stripe', window);
  }

  @Post("webhooks/paypal/replay")
  async replayPayPalWebhooks(@Query('window') window: string = '24h') {
    return this.adminService.replayWebhooks('paypal', window);
  }

  @Get("metrics/slo")
  async getSLOMetrics(@Query('window') window: string = '1h') {
    return this.adminService.getSLOMetrics(window);
  }

  @Get("errors")
  async getErrors(@Query('window') window: string = '1h') {
    return this.adminService.getErrors(window);
  }

  @Get('users')
  async listUsers(
    @Query('page') page = '1',
    @Query('page_size') pageSize = '25',
    @Query('q') q?: string
  ) {
    const p = parseInt(page) || 1;
    const ps = Math.min(100, parseInt(pageSize) || 25);
    return await this.adminService.listUsers(p, ps, q);
  }

  @Get('orgs')
  async listOrgs(
    @Query('page') page = '1',
    @Query('page_size') pageSize = '25',
    @Query('q') q?: string
  ) {
    const p = parseInt(page) || 1;
    const ps = Math.min(100, parseInt(pageSize) || 25);
    return await this.adminService.listOrgs(p, ps, q);
  }

  @Post("issues")
  async createIssue(@Query('source') source: string, @Query('error_id') errorId: string) {
    return this.adminService.createIssue(source, errorId);
  }
}
