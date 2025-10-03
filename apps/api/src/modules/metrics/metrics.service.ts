import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Registry, Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  // Core metrics
  readonly quoteStatusTransitions: Counter;
  readonly queueOldestJobAge: Gauge;
  readonly queueFailed24h: Gauge;
  readonly pricingLatencyMs: Histogram;
  readonly pricingOptimisticToFinalMs: Histogram;
  readonly queueWaitTimeMs: Histogram;
  readonly queueProcessTimeMs: Histogram;
  readonly queueThroughputPerMin: Gauge;
  readonly queueWaitingJobs: Gauge;
  readonly queueActiveJobs: Gauge;

  constructor() {
    this.quoteStatusTransitions = new Counter({
      name: 'quote_status_transition_total',
      help: 'Count of quote status transitions',
      labelNames: ['from', 'to']
    });
    this.queueOldestJobAge = new Gauge({
      name: 'queue_oldest_job_age_seconds',
      help: 'Age in seconds of oldest waiting/active job',
      labelNames: ['queue']
    });
    this.queueFailed24h = new Gauge({
      name: 'queue_failed_24h',
      help: 'Number of failed jobs in last 24h (sample window)',
      labelNames: ['queue']
    });
    this.pricingLatencyMs = new Histogram({
      name: 'pricing_event_latency_ms',
      help: 'Latency distribution for pricing updates (final events)',
      buckets: [50, 100, 250, 500, 1000, 2000, 5000]
    });
    this.pricingOptimisticToFinalMs = new Histogram({
      name: 'pricing_optimistic_to_final_ms',
      help: 'Observed optimistic to final pricing delta',
      buckets: [50, 100, 250, 500, 1000, 2000, 5000]
    });
    this.queueWaitTimeMs = new Histogram({
      name: 'queue_job_wait_time_ms',
      help: 'Time jobs spend waiting in queue before first processing',
      labelNames: ['queue'],
      buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000]
    });
    this.queueProcessTimeMs = new Histogram({
      name: 'queue_job_process_time_ms',
      help: 'Job processing duration (active start to completion)',
      labelNames: ['queue'],
      buckets: [5, 10, 20, 50, 100, 250, 500, 1000, 2000, 5000, 10000]
    });
    this.queueThroughputPerMin = new Gauge({
      name: 'queue_throughput_per_minute',
      help: 'Approximate completed jobs per minute (rolling sample)',
      labelNames: ['queue']
    });
    this.queueWaitingJobs = new Gauge({
      name: 'queue_waiting_jobs',
      help: 'Current number of waiting jobs',
      labelNames: ['queue']
    });
    this.queueActiveJobs = new Gauge({
      name: 'queue_active_jobs',
      help: 'Current number of active jobs',
      labelNames: ['queue']
    });

    collectDefaultMetrics({ register: this.registry });
    this.registry.registerMetric(this.quoteStatusTransitions);
    this.registry.registerMetric(this.queueOldestJobAge);
    this.registry.registerMetric(this.queueFailed24h);
    this.registry.registerMetric(this.pricingLatencyMs);
    this.registry.registerMetric(this.pricingOptimisticToFinalMs);
  this.registry.registerMetric(this.queueWaitTimeMs);
  this.registry.registerMetric(this.queueProcessTimeMs);
  this.registry.registerMetric(this.queueThroughputPerMin);
  this.registry.registerMetric(this.queueWaitingJobs);
  this.registry.registerMetric(this.queueActiveJobs);
  }

  onModuleInit() {
    // Placeholder: could schedule periodic collection if required
  }

  getRegistry() { return this.registry; }
}
