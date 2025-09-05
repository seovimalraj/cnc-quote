import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';

export interface HealthStatus {
  service: string;
  status: 'ok' | 'warn' | 'down';
  latency_ms: number | null;
  last_heartbeat: string;
  notes: string | null;
  meta?: Record<string, any>;
}

export interface MetricPoint {
  t: string;
  v: number;
  labels?: Record<string, any>;
}

export interface HeatmapCell {
  x: string;
  y: string;
  count: number;
}

@Injectable()
export class AdminHealthService {
  private readonly logger = new Logger(AdminHealthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getApiHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Check database connectivity
      const { error } = await this.supabase.client
        .from('users')
        .select('id')
        .limit(1);

      const latency = Date.now() - startTime;

      return {
        service: 'api',
        status: error ? 'down' : 'ok',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: error ? `Database error: ${error.message}` : null,
        meta: {
          db_connected: !error,
          version: process.env.npm_package_version || 'unknown',
        },
      };
    } catch (error) {
      return {
        service: 'api',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `Health check failed: ${error.message}`,
      };
    }
  }

  async getCadHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // For now, return a mock health status since we don't have HTTP client set up
      const latency = Date.now() - startTime;

      return {
        service: 'cad',
        status: 'ok', // Would check actual CAD service health
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: null,
        meta: {
          version: '1.0.0',
        },
      };
    } catch (error) {
      return {
        service: 'cad',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `CAD service check failed: ${error.message}`,
      };
    }
  }

  async getQueuesHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Get queue stats (mock for now)
      const queueStats = await this.getQueueStats();

      const latency = Date.now() - startTime;
      const totalDepth = queueStats.reduce((sum, q) => sum + q.depth, 0);

      return {
        service: 'queues',
        status: totalDepth > 300 ? 'warn' : 'ok',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: totalDepth > 300 ? `High queue depth: ${totalDepth}` : null,
        meta: {
          total_depth: totalDepth,
          queues: queueStats,
        },
      };
    } catch (error) {
      return {
        service: 'queues',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `Queue health check failed: ${error.message}`,
      };
    }
  }

  async getDbHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Run a simple query to check DB health
      const { data, error } = await this.supabase.client
        .from('users')
        .select('count')
        .limit(1);

      const latency = Date.now() - startTime;

      return {
        service: 'db',
        status: error ? 'down' : 'ok',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: error ? `Database error: ${error.message}` : null,
        meta: {
          connection_pool_size: process.env.DB_POOL_SIZE || 'unknown',
        },
      };
    } catch (error) {
      return {
        service: 'db',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `Database health check failed: ${error.message}`,
      };
    }
  }

  async getStripeHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Check Stripe connectivity (mock for now)
      const latency = Date.now() - startTime;

      return {
        service: 'stripe',
        status: 'ok', // Would check Stripe API health
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: null,
        meta: {
          webhooks_enabled: true,
        },
      };
    } catch (error) {
      return {
        service: 'stripe',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `Stripe health check failed: ${error.message}`,
      };
    }
  }

  async getPaypalHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Check PayPal connectivity (mock for now)
      const latency = Date.now() - startTime;

      return {
        service: 'paypal',
        status: 'ok', // Would check PayPal API health
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: null,
        meta: {
          webhooks_enabled: true,
        },
      };
    } catch (error) {
      return {
        service: 'paypal',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `PayPal health check failed: ${error.message}`,
      };
    }
  }

  async getStorageHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Check Supabase Storage health
      const { data, error } = await this.supabase.client.storage
        .from('files')
        .list('', { limit: 1 });

      const latency = Date.now() - startTime;

      return {
        service: 'storage',
        status: error ? 'down' : 'ok',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: error ? `Storage error: ${error.message}` : null,
        meta: {
          bucket_count: data?.length || 0,
        },
      };
    } catch (error) {
      return {
        service: 'storage',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `Storage health check failed: ${error.message}`,
      };
    }
  }

  async getWidgetOriginsHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Check widget origins configuration
      const { data, error } = await this.supabase.client
        .from('organizations')
        .select('widget_origins')
        .limit(10);

      const latency = Date.now() - startTime;
      const totalOrigins = data?.reduce((sum, org) => sum + (org.widget_origins?.length || 0), 0) || 0;

      return {
        service: 'widget_origins',
        status: 'ok',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: null,
        meta: {
          total_origins: totalOrigins,
          organizations_checked: data?.length || 0,
        },
      };
    } catch (error) {
      return {
        service: 'widget_origins',
        status: 'down',
        latency_ms: Date.now() - startTime,
        last_heartbeat: new Date().toISOString(),
        notes: `Widget origins check failed: ${error.message}`,
      };
    }
  }

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
        return null;
      }

      return data[0].value;
    } catch (error) {
      this.logger.error(`Failed to get gauge for ${metric}`, error);
      return null;
    }
  }

  async getErrorHeatmap(window: string = '1h'): Promise<HeatmapCell[]> {
    try {
      const windowMs = this.parseWindow(window);
      const since = new Date(Date.now() - windowMs).toISOString();

      const { data, error } = await this.supabase.client
        .from('error_events')
        .select('module, status_code, count')
        .gte('timestamp', since)
        .order('module')
        .order('status_code');

      if (error) {
        this.logger.error('Failed to get error heatmap', error);
        return [];
      }

      return data?.map(row => ({
        x: row.module,
        y: row.status_code?.toString() || 'unknown',
        count: row.count,
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get error heatmap', error);
      return [];
    }
  }

  private async getQueueStats(): Promise<Array<{ name: string; depth: number }>> {
    // This would integrate with BullMQ to get actual queue stats
    // For now, return mock data
    return [
      { name: 'cad', depth: 5 },
      { name: 'qap', depth: 2 },
      { name: 'email', depth: 1 },
    ];
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
