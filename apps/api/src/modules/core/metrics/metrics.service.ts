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
  // Admin pricing recalc metrics
  readonly recalcRunsTotal: Counter;
  readonly recalcItemsTotal: Counter;
  readonly recalcItemDurationMs: Histogram;
  readonly recalcCircuitTrippedTotal: Counter;
  // Supplier sync metrics
  readonly supplierCapabilityUpdatesTotal: Counter;
  readonly supplierApprovalTotal: Counter;
  readonly supplierCapacityMismatchGauge: Gauge;
  readonly dfmFeedbackShiftTotal: Counter;

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

    // Admin pricing recalc metrics
    this.recalcRunsTotal = new Counter({
      name: 'admin_pricing_recalc_runs_total',
      help: 'Count of admin pricing recalc runs by status',
      labelNames: ['org_id', 'status', 'reason', 'dry_run']
    });
    this.recalcItemsTotal = new Counter({
      name: 'admin_pricing_recalc_items_total',
      help: 'Count of admin pricing recalc items by outcome',
      labelNames: ['org_id', 'outcome', 'reason', 'dry_run']
    });
    this.recalcItemDurationMs = new Histogram({
      name: 'admin_pricing_recalc_item_duration_ms',
      help: 'Item processing duration for admin pricing recalc',
      labelNames: ['org_id', 'outcome'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2000, 5000]
    });
    this.recalcCircuitTrippedTotal = new Counter({
      name: 'admin_pricing_recalc_circuit_tripped_total',
      help: 'Count of recalc runs where circuit-breaker tripped',
      labelNames: ['org_id']
    });

    // Supplier sync metrics
    this.supplierCapabilityUpdatesTotal = new Counter({
      name: 'supplier_capability_updates_total',
      help: 'Count of supplier capability update fields',
      labelNames: ['org_id', 'supplier_id', 'field']
    });
    this.supplierApprovalTotal = new Counter({
      name: 'supplier_approval_total',
      help: 'Count of supplier approvals recorded by outcome',
      labelNames: ['org_id', 'supplier_id', 'outcome']
    });
    this.supplierCapacityMismatchGauge = new Gauge({
      name: 'supplier_capacity_mismatch_gauge',
      help: 'Percentage of demand not covered by supplier capacity (0..1)',
      labelNames: ['org_id', 'process']
    });
    this.dfmFeedbackShiftTotal = new Counter({
      name: 'dfm_feedback_shift_total',
      help: 'Count of times supplier capability changed DFM outcome',
      labelNames: ['org_id', 'kind']
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
  this.registry.registerMetric(this.recalcRunsTotal);
  this.registry.registerMetric(this.recalcItemsTotal);
  this.registry.registerMetric(this.recalcItemDurationMs);
  this.registry.registerMetric(this.recalcCircuitTrippedTotal);
  this.registry.registerMetric(this.supplierCapabilityUpdatesTotal);
  this.registry.registerMetric(this.supplierApprovalTotal);
  this.registry.registerMetric(this.supplierCapacityMismatchGauge);
  this.registry.registerMetric(this.dfmFeedbackShiftTotal);
  }

  onModuleInit() {
    // Placeholder: could schedule periodic collection if required
  }

  getRegistry() { return this.registry; }
}
