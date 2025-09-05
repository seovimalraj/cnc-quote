import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';
import { MetricPoint } from '../admin-health/admin-health.service';

export interface HistogramBucket {
  range: string;
  count: number;
  percentage: number;
}

@Injectable()
export class AdminMetricsService {
  private readonly logger = new Logger(AdminMetricsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getP95Metric(metric: string, window: string = '1h'): Promise<number | null> {
    try {
      const windowMs = this.parseWindow(window);
      const since = new Date(Date.now() - windowMs).toISOString();

      const { data, error } = await this.supabase.client
        .from('metrics_timeseries')
        .select('value')
        .eq('metric', metric)
        .eq('percentile', 'p95')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error || !data?.length) {
        this.logger.warn(`No P95 data found for ${metric} in window ${window}`);
        return null;
      }

      return data[0].value;
    } catch (error) {
      this.logger.error(`Failed to get P95 for ${metric}`, error);
      return null;
    }
  }

  async getMetricSeries(metric: string, label?: string, window: string = '1h'): Promise<MetricPoint[]> {
    try {
      const windowMs = this.parseWindow(window);
      const since = new Date(Date.now() - windowMs).toISOString();

      let query = this.supabase.client
        .from('metrics_timeseries')
        .select('timestamp, value, labels')
        .eq('metric', metric)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });

      if (label) {
        query = query.eq('labels->>label', label);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to get metric series for ${metric}`, error);
        return [];
      }

      return data?.map(row => ({
        t: row.timestamp,
        v: row.value,
        labels: row.labels,
      })) || [];
    } catch (error) {
      this.logger.error(`Failed to get metric series for ${metric}`, error);
      return [];
    }
  }

  async getGaugeMetric(metric: string): Promise<number | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('metrics_gauges')
        .select('value')
        .eq('metric', metric)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error || !data?.length) {
        this.logger.warn(`No gauge data found for ${metric}`);
        return null;
      }

      return data[0].value;
    } catch (error) {
      this.logger.error(`Failed to get gauge for ${metric}`, error);
      return null;
    }
  }

  async getHistogramData(metric: string, window: string = '1h'): Promise<HistogramBucket[]> {
    try {
      const windowMs = this.parseWindow(window);
      const since = new Date(Date.now() - windowMs).toISOString();

      const { data, error } = await this.supabase.client
        .from('metrics_histogram')
        .select('bucket_range, count')
        .eq('metric', metric)
        .gte('timestamp', since)
        .order('bucket_range');

      if (error) {
        this.logger.error(`Failed to get histogram for ${metric}`, error);
        return [];
      }

      const total = data?.reduce((sum, bucket) => sum + bucket.count, 0) || 1;

      return data?.map(bucket => ({
        range: bucket.bucket_range,
        count: bucket.count,
        percentage: (bucket.count / total) * 100,
      })) || [];
    } catch (error) {
      this.logger.error(`Failed to get histogram for ${metric}`, error);
      return [];
    }
  }

  async storeMetricPoint(
    metric: string,
    value: number,
    percentile?: string,
    labels?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('metrics_timeseries')
        .insert({
          metric,
          value,
          percentile: percentile || 'raw',
          labels: labels || {},
          timestamp: new Date().toISOString(),
        });

      if (error) {
        this.logger.error(`Failed to store metric point for ${metric}`, error);
      }
    } catch (error) {
      this.logger.error(`Failed to store metric point for ${metric}`, error);
    }
  }

  async storeGaugeValue(metric: string, value: number): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('metrics_gauges')
        .insert({
          metric,
          value,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        this.logger.error(`Failed to store gauge value for ${metric}`, error);
      }
    } catch (error) {
      this.logger.error(`Failed to store gauge value for ${metric}`, error);
    }
  }

  async storeHistogramBucket(
    metric: string,
    bucketRange: string,
    count: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('metrics_histogram')
        .insert({
          metric,
          bucket_range: bucketRange,
          count,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        this.logger.error(`Failed to store histogram bucket for ${metric}`, error);
      }
    } catch (error) {
      this.logger.error(`Failed to store histogram bucket for ${metric}`, error);
    }
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1h

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }
}
