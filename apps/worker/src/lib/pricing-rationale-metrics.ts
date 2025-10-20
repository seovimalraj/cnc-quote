import { Attributes, metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('worker.pricing-rationale');

const latencyHistogram = meter.createHistogram('pricing_rationale_latency_seconds', {
  description: 'Latency for generating pricing rationale summaries',
  unit: 's',
});

const failureCounter = meter.createCounter('pricing_rationale_failures_total', {
  description: 'Total count of pricing rationale generation failures',
});

export function recordPricingRationaleLatency(durationMs: number, attributes: Attributes = {}): void {
  latencyHistogram.record(durationMs / 1000, attributes);
}

export function incrementPricingRationaleFailure(attributes: Attributes = {}): void {
  failureCounter.add(1, attributes);
}
