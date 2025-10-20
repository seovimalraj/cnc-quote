import { Gauge, Pushgateway, Registry } from 'prom-client';
import { logger } from './logger.js';
import { config } from '../config.js';

export interface ComplianceMetricSample {
  code: string;
  severity: string;
  orgId: string | null;
  eventCount: number;
  quoteCount: number;
}

export interface MetricsPublisher {
  publishCompliance(samples: ComplianceMetricSample[]): Promise<void>;
}

class NoopMetricsPublisher implements MetricsPublisher {
  async publishCompliance(): Promise<void> {
    logger.debug('Skipping compliance metrics push; Pushgateway URL not configured');
  }
}

class PushgatewayMetricsPublisher implements MetricsPublisher {
  constructor(private readonly url: string) {}

  async publishCompliance(samples: ComplianceMetricSample[]): Promise<void> {
    const gateway = new Pushgateway(this.url);

    if (samples.length === 0) {
      try {
        await gateway.delete({ jobName: 'compliance_daily_rollup' });
        logger.info('Cleared compliance metrics from Pushgateway (no samples)');
      } catch (error: any) {
        if (error?.statusCode !== 404) {
          logger.warn({ error }, 'Failed to clear compliance metrics from Pushgateway');
        }
      }
      return;
    }

    const registry = new Registry();

    const alertGauge = new Gauge({
      name: 'compliance_alert_count',
      help: 'Daily compliance alert totals (24h window)',
      labelNames: ['code', 'severity', 'org'],
      registers: [registry],
    });

    const uniqueGauge = new Gauge({
      name: 'compliance_alert_unique_quotes',
      help: 'Unique quotes triggering compliance alerts (24h window)',
      labelNames: ['code', 'severity', 'org'],
      registers: [registry],
    });

    samples.forEach((sample) => {
      const labels = {
        code: sample.code,
        severity: sample.severity,
        org: sample.orgId ?? 'unknown',
      };
      alertGauge.set(labels, sample.eventCount);
      uniqueGauge.set(labels, sample.quoteCount);
    });

    const pushClient = new Pushgateway(this.url, {}, registry);
    await pushClient.push({ jobName: 'compliance_daily_rollup' });
    logger.info({ sampleCount: samples.length }, 'Pushed compliance metrics to Pushgateway');
  }
}

let publisher: MetricsPublisher | null = null;

export function getMetricsPublisher(): MetricsPublisher {
  if (!publisher) {
    publisher = config.pushgatewayUrl
      ? new PushgatewayMetricsPublisher(config.pushgatewayUrl)
      : new NoopMetricsPublisher();
  }
  return publisher;
}
