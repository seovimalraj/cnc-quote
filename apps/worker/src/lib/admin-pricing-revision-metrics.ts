import { Attributes, metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('worker.admin-pricing-revision');

const latencyHistogram = meter.createHistogram('admin_pricing_revision_latency_seconds', {
  description: 'Latency for generating admin pricing revision assistant proposals',
  unit: 's',
});

const failureCounter = meter.createCounter('admin_pricing_revision_failures_total', {
  description: 'Total count of failed admin pricing revision assistant runs',
});

export function recordAdminPricingRevisionLatency(durationMs: number, attributes: Attributes = {}): void {
  latencyHistogram.record(durationMs / 1000, attributes);
}

export function incrementAdminPricingRevisionFailure(attributes: Attributes = {}): void {
  failureCounter.add(1, attributes);
}
