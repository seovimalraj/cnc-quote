import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';
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

type QueueSnapshot = {
  name: string;
  waiting: number;
  delayed: number;
  active: number;
  failed: number;
  oldest_age_sec: number | null;
  error?: string;
};

@Injectable()
export class AdminHealthService {
  private readonly logger = new Logger(AdminHealthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectQueue('cad') private readonly cadQueue: Queue,
    @InjectQueue('pricing') private readonly pricingQueue: Queue,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('pdf') private readonly pdfQueue: Queue,
    @InjectQueue('qap') private readonly qapQueue: Queue,
    @InjectQueue('files') private readonly filesQueue: Queue,
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
    const baseUrl = this.configService.get<string>('CAD_SERVICE_URL', 'http://cad-service:8000');
    const endpoint = this.buildServiceUrl(baseUrl, '/health');

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ status?: string; timestamp?: string; version?: string }>(endpoint, {
          timeout: 4000,
        }),
      );

      const latency = Date.now() - startTime;
      const payload = response.data ?? {};
      const reportedStatus = (payload.status ?? '').toLowerCase();

      const status: HealthStatus['status'] = reportedStatus === 'healthy' || reportedStatus === 'ok'
        ? 'ok'
        : reportedStatus === 'degraded'
          ? 'warn'
          : 'warn';

      const notes = status === 'ok' ? null : `CAD reports status: ${reportedStatus || 'unknown'}`;

      return {
        service: 'cad',
        status,
        latency_ms: latency,
        last_heartbeat: payload.timestamp ?? new Date().toISOString(),
        notes,
        meta: {
          endpoint,
          version: payload.version ?? response.headers?.['x-service-version'] ?? null,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown CAD service error';
      this.logger.error(`CAD health check failed`, error);
      return {
        service: 'cad',
        status: 'down',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: `CAD health check failed: ${message}`,
      };
    }
  }

  async getQueuesHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const queueStats = await this.getQueueStats();
      const latency = Date.now() - startTime;

      const totalDepth = queueStats.reduce((sum, q) => sum + q.waiting + q.delayed, 0);
      const failedQueues = queueStats.filter((q) => q.failed > 0);
      const erroredQueues = queueStats.filter((q) => q.error);

      let status: HealthStatus['status'] = 'ok';
      const notes: string[] = [];

      if (erroredQueues.length) {
        status = 'warn';
        notes.push(`Unable to query queues: ${erroredQueues.map((q) => q.name).join(', ')}`);
      }

      if (failedQueues.length) {
        status = 'warn';
        notes.push(`Failed jobs present on ${failedQueues.length} queue(s)`);
      }

      if (totalDepth > 300) {
        status = 'warn';
        notes.push(`Total waiting backlog ${totalDepth}`);
      }

      return {
        service: 'queues',
        status,
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: notes.length ? notes.join('; ') : null,
        meta: {
          total_waiting: totalDepth,
          queues: queueStats,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown queue health error';
      this.logger.error('Queue health check failed', error);
      return {
        service: 'queues',
        status: 'down',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: `Queue health check failed: ${message}`,
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

  async getStripeHealth(window: string = '1h'): Promise<HealthStatus> {
    return this.getWebhookProviderHealth('stripe', window);
  }

  async getPaypalHealth(window: string = '1h'): Promise<HealthStatus> {
    return this.getWebhookProviderHealth('paypal', window);
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

  private async getWebhookProviderHealth(provider: string, window: string): Promise<HealthStatus> {
    const startTime = Date.now();
    const windowMs = this.parseWindow(window);
    const since = new Date(Date.now() - windowMs).toISOString();

    try {
      const baseQuery = this.supabase.client
        .from('admin_webhook_status')
        .select('provider, status, failed_24h, last_event_type, last_delivery_at, updated_at')
        .eq('provider', provider)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(1);

      let { data, error } = await baseQuery;
      if (error) {
        throw error;
      }

      if (!data?.length) {
        const fallback = await this.supabase.client
          .from('admin_webhook_status')
          .select('provider, status, failed_24h, last_event_type, last_delivery_at, updated_at')
          .eq('provider', provider)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (fallback.error) {
          throw fallback.error;
        }

        data = fallback.data ?? [];
      }

      const row = data[0];

      if (!row) {
        return {
          service: provider,
          status: 'warn',
          latency_ms: Date.now() - startTime,
          last_heartbeat: new Date().toISOString(),
          notes: `No webhook telemetry found for ${provider}`,
        };
      }

      const latency = Date.now() - startTime;
      const failed24h = row.failed_24h ?? 0;
      const providerStatus = (row.status ?? '').toLowerCase();
      const lastDeliveryAgeSec = row.last_delivery_at
        ? Math.max(0, Math.round((Date.now() - Date.parse(row.last_delivery_at)) / 1000))
        : null;

      let status: HealthStatus['status'] = 'ok';
      const notes: string[] = [];

      if (providerStatus === 'down') {
        status = 'down';
        notes.push('Provider reported as down');
      } else if (providerStatus === 'degraded') {
        status = 'warn';
        notes.push('Provider reported as degraded');
      }

      if (failed24h > 0) {
        status = status === 'down' ? 'down' : 'warn';
        notes.push(`${failed24h} failed deliveries in the last 24h`);
      }

      if (lastDeliveryAgeSec !== null && lastDeliveryAgeSec > 3600) {
        status = status === 'down' ? 'down' : 'warn';
        notes.push(`Last delivery ${Math.floor(lastDeliveryAgeSec / 60)} minutes ago`);
      }

      return {
        service: provider,
        status,
        latency_ms: latency,
        last_heartbeat: row.updated_at ?? new Date().toISOString(),
        notes: notes.length ? notes.join('; ') : null,
        meta: {
          failed_24h: failed24h,
          last_event_type: row.last_event_type ?? null,
          last_delivery_age_sec: lastDeliveryAgeSec,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : `Unknown ${provider} webhook error`;
      this.logger.error(`${provider} health check failed`, error);
      return {
        service: provider,
        status: 'down',
        latency_ms: latency,
        last_heartbeat: new Date().toISOString(),
        notes: message,
      };
    }
  }

  private async getQueueStats(): Promise<QueueSnapshot[]> {
    const queues: Array<{ name: string; queue: Queue }> = [
      { name: 'cad', queue: this.cadQueue },
      { name: 'pricing', queue: this.pricingQueue },
      { name: 'pdf', queue: this.pdfQueue },
      { name: 'email', queue: this.emailQueue },
      { name: 'qap', queue: this.qapQueue },
      { name: 'files', queue: this.filesQueue },
    ];

    const snapshots: QueueSnapshot[] = [];

    for (const { name, queue } of queues) {
      try {
        const counts = await queue.getJobCounts();
        const waitingJobs = await queue.getWaiting(0, 1);
        const delayedJobs = await queue.getDelayed(0, 1);
        const oldestTimestamp = waitingJobs[0]?.timestamp ?? delayedJobs[0]?.timestamp ?? null;
        const oldestAgeSec = oldestTimestamp ? Math.max(0, Math.floor((Date.now() - oldestTimestamp) / 1000)) : null;

        snapshots.push({
          name,
          waiting: counts.waiting ?? 0,
          delayed: counts.delayed ?? 0,
          active: counts.active ?? 0,
          failed: counts.failed ?? 0,
          oldest_age_sec: oldestAgeSec,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown queue error';
        this.logger.error(`Failed to collect queue stats for ${name}`, error);
        snapshots.push({
          name,
          waiting: 0,
          delayed: 0,
          active: 0,
          failed: 0,
          oldest_age_sec: null,
          error: message,
        });
      }
    }

    return snapshots;
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

  private buildServiceUrl(baseUrl: string, path: string): string {
    if (!baseUrl) {
      return path;
    }

    const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${trimmedBase}${normalizedPath}`;
  }
}
