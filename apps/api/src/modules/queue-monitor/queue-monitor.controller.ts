import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { QueueMonitorService } from "./queue-monitor.service";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";

@ApiTags("Queue Monitor")
@Controller("admin")
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
@Roles('admin', 'org_admin', 'reviewer')
@ApiBearerAuth()
export class QueueMonitorController {
  constructor(private readonly queueMonitorService: QueueMonitorService) {}

  @Get("queues/status")
  async getQueueStatus(@Query('window') window: string = '1h') {
    return this.queueMonitorService.getQueueStatus(window);
  }

  @Post("queues/:name/retry-failed")
  async retryFailedJobs(
    @Param('name') queueName: string,
    @Query('max') max: number = 100,
    @Query('window') window: string = '24h'
  ) {
    return this.queueMonitorService.retryFailedJobs(queueName, max, window);
  }

  @Post("queues/:name/clean-completed")
  async cleanCompletedJobs(
    @Param('name') queueName: string,
    @Query('max') max: number = 1000,
    @Query('beforeSec') beforeSec: number = 3600
  ) {
    return this.queueMonitorService.cleanCompletedJobs(queueName, max, beforeSec);
  }

  @Post("queues/jobs/:jobId/retry")
  async retryJob(
    @Param('jobId') jobId: string,
    @Query('queue') queueName: string
  ) {
    return this.queueMonitorService.retryJob(queueName, jobId);
  }

  @Post("queues/retry-all")
  async retryAllFailedJobs(@Query('window') window: string = '24h') {
    return this.queueMonitorService.retryAllFailedJobs(window);
  }

  @Get("queues/failed")
  async getFailedJobs(@Query('window') window: string = '24h') {
    return this.queueMonitorService.getFailedJobs(window);
  }

  @Get("metrics/db")
  async getDatabaseMetrics(@Query('window') window: string = '1h') {
    return this.queueMonitorService.getDatabaseMetrics(window);
  }

  @Get("webhooks/status")
  async getWebhookStatus(@Query('window') window: string = '1h') {
    return this.queueMonitorService.getWebhookStatus(window);
  }

  @Post("webhooks/stripe/replay")
  async replayStripeWebhooks(@Query('window') window: string = '24h') {
    return this.queueMonitorService.replayWebhooks('stripe', window);
  }

  @Post("webhooks/paypal/replay")
  async replayPayPalWebhooks(@Query('window') window: string = '24h') {
    return this.queueMonitorService.replayWebhooks('paypal', window);
  }

  @Get("metrics/slo")
  async getSLOMetrics(@Query('window') window: string = '1h') {
    return this.queueMonitorService.getSLOMetrics(window);
  }

  @Get("errors")
  async getErrors(@Query('window') window: string = '1h') {
    return this.queueMonitorService.getErrors(window);
  }

  @Get("review/summary")
  async getReviewSummary(@Query('window') window: string = '1h') {
    return this.queueMonitorService.getReviewSummary(window);
  }

  // Legacy endpoints for backward compatibility
  @Get("queues/metrics")
  async getQueueMetrics() {
    return this.queueMonitorService.getQueueMetrics();
  }

  @Get("queues/performance")
  async getQueuePerformance() {
    return this.queueMonitorService.getQueuePerformance();
  }

  @Get('dashboard/aggregate')
  async getAggregateAdminDashboard() {
    const [queues, slo, db] = await Promise.all([
      this.queueMonitorService.getQueueMetrics(),
      this.queueMonitorService.getSLOMetrics('1h'),
      this.queueMonitorService.getDatabaseMetrics('1h')
    ]);
    return {
      timestamp: new Date().toISOString(),
      queues,
      slo,
      db,
      overall_health: (queues as any).overall_health
    };
  }

  @Get("queues/counts")
  async getQueueCounts() {
    return this.queueMonitorService.getQueueCounts();
  }

  @Get("queues/health")
  async getQueueHealth() {
    return this.queueMonitorService.getQueueHealthSummary();
  }
}
