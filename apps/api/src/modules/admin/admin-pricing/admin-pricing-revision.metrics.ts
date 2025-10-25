import { Attributes, metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('api.admin-pricing-revision');

const requestHistogram = meter.createHistogram('admin_pricing_revision_request_latency_seconds', {
  description: 'Latency from API request to queueing admin pricing revision assistant run',
  unit: 's',
});

const requestCounter = meter.createCounter('admin_pricing_revision_requests_total', {
  description: 'Total admin pricing revision assistant requests received by API',
});

const rateLimitedCounter = meter.createCounter('admin_pricing_revision_rate_limited_total', {
  description: 'Total admin pricing revision assistant requests blocked by rate limiting',
});

const anomalyCounter = meter.createCounter('admin_pricing_revision_anomalies_total', {
  description: 'Total anomaly events detected for admin pricing revision assistant usage',
});

const approvalCounter = meter.createCounter('admin_pricing_revision_approvals_total', {
  description: 'Total admin pricing revision assistant approvals recorded',
});

export function recordRevisionRequestLatency(durationMs: number, attributes: Attributes = {}): void {
  requestHistogram.record(durationMs / 1000, attributes);
}

export function incrementRevisionRequest(attributes: Attributes = {}): void {
  requestCounter.add(1, attributes);
}

export function incrementRevisionRateLimited(attributes: Attributes = {}): void {
  rateLimitedCounter.add(1, attributes);
}

export function incrementRevisionAnomaly(attributes: Attributes = {}): void {
  anomalyCounter.add(1, attributes);
}

export function incrementRevisionApproval(attributes: Attributes = {}): void {
  approvalCounter.add(1, attributes);
}
