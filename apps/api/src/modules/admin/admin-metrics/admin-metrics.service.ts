import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { MetricPoint } from "../admin/admin/admin-health/admin-health.service";
import { ContractsVNext } from '@cnc-quote/shared';

export interface HistogramBucket {
  range: string;
  count: number;
  percentage: number;
}

const SLO_METRIC_CANDIDATES = {
  firstPrice: ['slo.time_to_first_price_ms', 'pricing.time_to_first_price_ms', 'pricing_event_latency_ms'] as const,
  cad: ['slo.cad_analysis_ms', 'cad.analysis_duration_ms', 'cad_pipeline.total_ms'] as const,
  paymentToOrder: ['slo.payment_to_order_ms', 'orders.payment_to_fulfillment_ms'] as const,
  oldestJobAge: ['queue_oldest_job_age_seconds'] as const,
} as const;

const DB_METRIC_CANDIDATES = {
  read: ['db.read_latency_ms', 'postgres.read_latency_ms'] as const,
  write: ['db.write_latency_ms', 'postgres.write_latency_ms'] as const,
  errorRate: ['db.error_rate_pct', 'postgres.error_rate_pct'] as const,
} as const;

type MetricCandidateSet = readonly string[];

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

  async getSloSnapshot(window: string = '1h'): Promise<ContractsVNext.AdminSloSnapshot> {
    const missing: string[] = [];

    const [firstPrice, cad, paymentToOrder, oldestJob, firstSeries, cadSeries, paymentSeries] = await Promise.all([
      this.resolveP95Metric(SLO_METRIC_CANDIDATES.firstPrice, window),
      this.resolveP95Metric(SLO_METRIC_CANDIDATES.cad, window),
      this.resolveP95Metric(SLO_METRIC_CANDIDATES.paymentToOrder, window),
      this.resolveGaugeMetric(SLO_METRIC_CANDIDATES.oldestJobAge),
      this.resolveMetricSeries(SLO_METRIC_CANDIDATES.firstPrice, window),
      this.resolveMetricSeries(SLO_METRIC_CANDIDATES.cad, window),
      this.resolveMetricSeries(SLO_METRIC_CANDIDATES.paymentToOrder, window),
    ]);

    if (!firstPrice.metric) missing.push(`p95:${SLO_METRIC_CANDIDATES.firstPrice.join('|')}`);
    if (!cad.metric) missing.push(`p95:${SLO_METRIC_CANDIDATES.cad.join('|')}`);
    if (!paymentToOrder.metric) missing.push(`p95:${SLO_METRIC_CANDIDATES.paymentToOrder.join('|')}`);
    if (!oldestJob.metric) missing.push(`gauge:${SLO_METRIC_CANDIDATES.oldestJobAge.join('|')}`);

    const samples = this.buildSloSamples({
      first: firstSeries.series,
      cad: cadSeries.series,
      payment: paymentSeries.series,
    });

    const observedAt = samples.length ? samples[samples.length - 1].ts : null;

    return {
      window,
      observed_at: observedAt,
      first_price_p95_ms: firstPrice.value,
      cad_p95_ms: cad.value,
      payment_to_order_p95_ms: paymentToOrder.value,
      oldest_job_age_sec: oldestJob.value,
      samples: samples.length ? samples : undefined,
      missing_metrics: missing.length ? missing : undefined,
    };
  }

  async getDatabaseLatencySnapshot(window: string = '1h'): Promise<ContractsVNext.AdminDbLatencySnapshot> {
    const missing: string[] = [];

    const [read, write, errorRate, readSeries, writeSeries] = await Promise.all([
      this.resolveP95Metric(DB_METRIC_CANDIDATES.read, window),
      this.resolveP95Metric(DB_METRIC_CANDIDATES.write, window),
      this.resolveGaugeMetric(DB_METRIC_CANDIDATES.errorRate),
      this.resolveMetricSeries(DB_METRIC_CANDIDATES.read, window),
      this.resolveMetricSeries(DB_METRIC_CANDIDATES.write, window),
    ]);

    if (!read.metric) missing.push(`p95:${DB_METRIC_CANDIDATES.read.join('|')}`);
    if (!write.metric) missing.push(`p95:${DB_METRIC_CANDIDATES.write.join('|')}`);
    if (!errorRate.metric) missing.push(`gauge:${DB_METRIC_CANDIDATES.errorRate.join('|')}`);

    const samples = this.buildDbSamples(readSeries.series, writeSeries.series);
    const observedAt = samples.length ? samples[samples.length - 1].ts : null;

    return {
      window,
      observed_at: observedAt,
      read_p95_ms: read.value,
      write_p95_ms: write.value,
      error_rate_pct: errorRate.value,
      samples: samples.length ? samples : undefined,
      missing_metrics: missing.length ? missing : undefined,
    };
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

  private async resolveP95Metric(candidates: MetricCandidateSet, window: string): Promise<{ metric: string | null; value: number | null }> {
    for (const metric of candidates) {
      const value = await this.getP95Metric(metric, window);
      if (value !== null && Number.isFinite(value)) {
        return { metric, value };
      }
    }
    return { metric: null, value: null };
  }

  private async resolveGaugeMetric(candidates: MetricCandidateSet): Promise<{ metric: string | null; value: number | null }> {
    for (const metric of candidates) {
      const value = await this.getGaugeMetric(metric);
      if (value !== null && Number.isFinite(value)) {
        return { metric, value };
      }
    }
    return { metric: null, value: null };
  }

  private async resolveMetricSeries(candidates: MetricCandidateSet, window: string): Promise<{ metric: string | null; series: MetricPoint[] }> {
    for (const metric of candidates) {
      const series = await this.getMetricSeries(metric, undefined, window);
      if (series.length) {
        return { metric, series };
      }
    }
    return { metric: null, series: [] };
  }

  private buildSloSamples(series: {
    first: MetricPoint[];
    cad: MetricPoint[];
    payment: MetricPoint[];
  }): ContractsVNext.AdminSloSample[] {
    const map = new Map<string, ContractsVNext.AdminSloSample>();

    const upsert = (ts: string) => {
      if (!map.has(ts)) {
        map.set(ts, { ts, first_price_ms: null, cad_ms: null, payment_to_order_ms: null });
      }
      return map.get(ts)!;
    };

    series.first.forEach((point) => {
      const sample = upsert(point.t);
      sample.first_price_ms = point.v;
    });

    series.cad.forEach((point) => {
      const sample = upsert(point.t);
      sample.cad_ms = point.v;
    });

    series.payment.forEach((point) => {
      const sample = upsert(point.t);
      sample.payment_to_order_ms = point.v;
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }

  private buildDbSamples(readSeries: MetricPoint[], writeSeries: MetricPoint[]): ContractsVNext.AdminDbLatencySample[] {
    const map = new Map<string, ContractsVNext.AdminDbLatencySample>();

    const upsert = (ts: string) => {
      if (!map.has(ts)) {
        map.set(ts, { ts, read_ms: null, write_ms: null });
      }
      return map.get(ts)!;
    };

    readSeries.forEach((point) => {
      const sample = upsert(point.t);
      sample.read_ms = point.v;
    });

    writeSeries.forEach((point) => {
      const sample = upsert(point.t);
      sample.write_ms = point.v;
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }
}
