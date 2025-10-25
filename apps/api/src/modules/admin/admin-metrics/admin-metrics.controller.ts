import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminMetricsService, HistogramBucket } from './admin-metrics.service';
import { MetricPoint } from "../admin-health/admin-health.service";
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from "../../core/auth/roles.guard";
import { Roles } from "../../core/auth/roles.decorator";

@Controller('admin/metrics')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'ops')
export class AdminMetricsController {
  constructor(private readonly adminMetricsService: AdminMetricsService) {}

  @Get('p95')
  async getP95(
    @Query('metric') metric: string,
    @Query('window') window: string = '1h',
  ): Promise<{ value: number | null }> {
    const value = await this.adminMetricsService.getP95Metric(metric, window);
    return { value };
  }

  @Get('series')
  async getSeries(
    @Query('metric') metric: string,
    @Query('label') label?: string,
    @Query('window') window: string = '1h',
  ): Promise<MetricPoint[]> {
    return this.adminMetricsService.getMetricSeries(metric, label, window);
  }

  @Get('gauge')
  async getGauge(
    @Query('metric') metric: string,
  ): Promise<{ value: number | null }> {
    const value = await this.adminMetricsService.getGaugeMetric(metric);
    return { value };
  }

  @Get('hist')
  async getHistogram(
    @Query('metric') metric: string,
    @Query('window') window: string = '1h',
  ): Promise<HistogramBucket[]> {
    return this.adminMetricsService.getHistogramData(metric, window);
  }
}
