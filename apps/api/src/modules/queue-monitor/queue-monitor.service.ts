import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QueueJobData, QueueStats } from "./queue-monitor.types";
import { JobCounts, QueueHealth, QueueHealthMetrics } from "./queue-monitor.metrics";
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name);
  private readonly perfSampleIntervalMs = parseInt(process.env.QUEUE_PERF_SAMPLE_MS || '60000');
  private lastPerfSample = 0;
  constructor(
    @InjectQueue("cad") private readonly cadQueue: Queue,
    @InjectQueue("pricing") private readonly pricingQueue: Queue,
    @InjectQueue("email") private readonly emailQueue: Queue,
    @InjectQueue("pdf") private readonly pdfQueue: Queue,
    @InjectQueue("qap") private readonly qapQueue: Queue,
    @InjectQueue("files") private readonly filesQueue: Queue,
    private readonly metricsService: MetricsService,
  ) {}

  async getQueueStatus(window: string = '1h') {
    const queues = [
      { name: 'cad:analyze', queue: this.cadQueue },
      { name: 'pdf:render', queue: this.pdfQueue },
      { name: 'pricing:calculate', queue: this.pricingQueue }
    ];

    const results = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const counts = await queue.getJobCounts();
        const failedJobs = await queue.getFailed(0, 100);
        const failed24h = failedJobs.filter(job =>
          job.finishedOn && (Date.now() - job.finishedOn) < 24 * 60 * 60 * 1000
        ).length;

        // Get oldest job age
        const waitingJobs = await queue.getWaiting(0, 1);
        const activeJobs = await queue.getActive(0, 1);
        let oldestJobAge = 0;

        if (waitingJobs.length > 0) {
          oldestJobAge = Math.floor((Date.now() - waitingJobs[0].timestamp) / 1000);
        } else if (activeJobs.length > 0) {
          oldestJobAge = Math.floor((Date.now() - activeJobs[0].timestamp) / 1000);
        }

        return {
          name,
          waiting: counts.waiting,
          active: counts.active,
          delayed: counts.delayed,
          failed_24h: failed24h,
          oldest_job_age_sec: oldestJobAge
        };
      })
    );

    // Emit queue health gauges
    for (const r of results) {
      this.metricsService.queueOldestJobAge.set({ queue: r.name }, r.oldest_job_age_sec);
      this.metricsService.queueFailed24h.set({ queue: r.name }, r.failed_24h);
    }
    return { queues: results };
  }

  async retryFailedJobs(queueName: string, max: number = 100, window: string = '24h') {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const failedJobs = await queue.getFailed(0, max);
    const windowMs = this.parseTimeWindow(window);
    const eligibleJobs = failedJobs.filter(job =>
      job.finishedOn && (Date.now() - job.finishedOn) < windowMs
    );

    const retryPromises = eligibleJobs.map(job => job.retry());
    const results = await Promise.all(retryPromises);

    return {
      retried: results.length,
      total_failed: failedJobs.length,
      window_seconds: windowMs / 1000
    };
  }

  async cleanCompletedJobs(queueName: string, max: number = 1000, beforeSec: number = 3600) {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const completedJobs = await queue.getCompleted(0, max);
    const cutoffTime = Date.now() - (beforeSec * 1000);
    const oldJobs = completedJobs.filter(job =>
      job.finishedOn && job.finishedOn < cutoffTime
    );

    const removePromises = oldJobs.map(job => job.remove());
    await Promise.all(removePromises);

    return {
      cleaned: oldJobs.length,
      total_completed: completedJobs.length,
      before_seconds: beforeSec
    };
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    await job.retry();
    return { success: true, job_id: jobId };
  }

  async retryAllFailedJobs(window: string = '24h') {
    const queues = [this.cadQueue, this.pdfQueue, this.pricingQueue];
    const windowMs = this.parseTimeWindow(window);

    const results = await Promise.all(
      queues.map(async (queue) => {
        const failedJobs = await queue.getFailed(0, 1000);
        const eligibleJobs = failedJobs.filter(job =>
          job.finishedOn && (Date.now() - job.finishedOn) < windowMs
        );

        const retryPromises = eligibleJobs.map(job => job.retry());
        await Promise.all(retryPromises);

        return {
          queue: queue.name,
          retried: eligibleJobs.length,
          total_failed: failedJobs.length
        };
      })
    );

    return {
      results,
      total_retried: results.reduce((sum, r) => sum + r.retried, 0),
      window_seconds: windowMs / 1000
    };
  }

  async getFailedJobs(window: string = '24h') {
    const queues = [
      { name: 'cad:analyze', queue: this.cadQueue },
      { name: 'pdf:render', queue: this.pdfQueue },
      { name: 'pricing:calculate', queue: this.pricingQueue }
    ];

    const windowMs = this.parseTimeWindow(window);
    const results = [];

    for (const { name, queue } of queues) {
      const failedJobs = await queue.getFailed(0, 50);
      const recentFailed = failedJobs.filter(job =>
        job.finishedOn && (Date.now() - job.finishedOn) < windowMs
      );

      for (const job of recentFailed) {
        results.push({
          when: new Date(job.finishedOn || job.timestamp).toISOString(),
          queue: name,
          jobId: job.id,
          attempts: job.attemptsMade,
          reason: job.failedReason || 'Unknown error'
        });
      }
    }

    return results.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  }

  async getDatabaseMetrics(window: string = '1h') {
    // Mock database metrics - in real implementation, this would query actual DB metrics
    return {
      read_p95_ms: 18,
      write_p95_ms: 22,
      error_rate_pct: 0.2,
      timeseries: {
        t: ['12:01', '12:02', '12:03'],
        read_ms: [15, 20, 18],
        write_ms: [18, 25, 22]
      }
    };
  }

  async getWebhookStatus(window: string = '1h') {
    // Mock webhook status - in real implementation, this would query webhook logs
    return {
      stripe: {
        status: 'OK',
        failed_24h: 0,
        last_event_type: 'checkout.session.completed',
        last_delivery_age: 42
      },
      paypal: {
        status: 'WARN',
        failed_24h: 1,
        last_event_type: 'PAYMENT.CAPTURE.COMPLETED',
        last_delivery_age: 180
      }
    };
  }

  async replayWebhooks(provider: string, window: string = '24h') {
    // Mock webhook replay - in real implementation, this would trigger webhook replays
    return {
      provider,
      replayed: provider === 'stripe' ? 0 : 1,
      window_seconds: this.parseTimeWindow(window) / 1000
    };
  }

  async getSLOMetrics(window: string = '1h') {
    // Mock SLO metrics - in real implementation, this would calculate from actual metrics
    return {
      first_price_p95_ms: 1450,
      cad_p95_ms: 18000,
      payment_to_order_p95_ms: 6200,
      oldest_job_age_sec: 210
    };
  }

  async getErrors(window: string = '1h') {
    // Mock error data - in real implementation, this would query Sentry/error logs
    return {
      sentry: [
        {
          id: 'err_123',
          service: 'api',
          title: 'TypeError: Cannot read property \'x\'',
          count_1h: 12,
          first_seen: '2025-09-05T10:22:00Z',
          last_seen: '2025-09-05T11:10:00Z',
          users_affected: 3,
          permalink: 'https://sentry.io/...'
        }
      ]
    };
  }

  async getReviewSummary(window: string = '1h') {
    // Mock review summary - in real implementation, this would query review queue
    return {
      count: 12,
      new_count: 3,
      aging_count: 6,
      breached_count: 3,
      items: [
        {
          quote_id: 'Q41-1742-8058',
          org: 'Acme Corp',
          value: 227.98,
          dfm_blockers: 0,
          age_min: 35,
          assignee: 'me@shop.com'
        },
        {
          quote_id: 'Q41-1742-8059',
          org: 'TechStart Inc',
          value: 1450.50,
          dfm_blockers: 2,
          age_min: 180,
          assignee: 'Unassigned'
        }
      ]
    };
  }

  private getQueueByName(name: string): Queue | null {
    const queueMap = {
      'cad:analyze': this.cadQueue,
      'pdf:render': this.pdfQueue,
      'pricing:calculate': this.pricingQueue
    };
    return queueMap[name as keyof typeof queueMap] || null;
  }

  private parseTimeWindow(window: string): number {
  const regex = /^(\d+)([smhd])$/;
  const match = regex.exec(window);
    if (!match) return 60 * 60 * 1000; // Default 1h

    const [, num, unit] = match;
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }

  async getQueueCounts(): Promise<Record<string, JobCounts>> {
    const [cad, pricing, pdf, qap, files] = await Promise.all([
      this.cadQueue.getJobCounts(),
      this.pricingQueue.getJobCounts(),
      this.pdfQueue.getJobCounts(),
      this.qapQueue.getJobCounts(),
      this.filesQueue.getJobCounts(),
    ]);

    return { cad, pricing, pdf, qap, files };
  }

  async getQueueStats(_queue: Queue, _active?: QueueJobData[]): Promise<QueueStats> {
    const counts = await this.getQueueCounts();
    const queueMetrics = {};

    for (const [queueName, jobCounts] of Object.entries(counts)) {
      queueMetrics[queueName] = {
        ...jobCounts,
        health: this.calculateQueueHealth(jobCounts),
      };
    }

    return {
      queue: "aggregate",
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      },
      jobs: {
        active: [],
        waiting: [],
        failed: [],
      }
    };
  }

  async getQueueMetrics(): Promise<Record<string, unknown>> {
    const counts = await this.getQueueCounts();
    const metrics: Record<string, unknown> = {};
    for (const [name, jobCounts] of Object.entries(counts)) {
      // Update point-in-time gauges
      this.metricsService.queueWaitingJobs.set({ queue: name }, jobCounts.waiting || 0);
      this.metricsService.queueActiveJobs.set({ queue: name }, jobCounts.active || 0);

      // Backlog age warnings (simple heuristic thresholds)
      if ((jobCounts.waiting || 0) > 5000) {
        this.logger.warn(`High backlog detected queue=${name} waiting=${jobCounts.waiting}`);
      } else if ((jobCounts.waiting || 0) > 1000) {
        this.logger.log(`Backlog elevated queue=${name} waiting=${jobCounts.waiting}`);
      }

      // Throttle performance sampling to configured interval
      let perf: any = null;
      const now = Date.now();
      if (now - this.lastPerfSample >= this.perfSampleIntervalMs) {
        perf = await this.sampleQueuePerformance(name);
      }
      metrics[name] = {
        counts: jobCounts,
        health: this.calculateQueueHealth(jobCounts),
        performance: perf
      };
    }
    if (Date.now() - this.lastPerfSample >= this.perfSampleIntervalMs) {
      this.lastPerfSample = Date.now();
    }
    return {
      timestamp: new Date().toISOString(),
      overall_health: this.calculateOverallHealth(
        Object.fromEntries(
          Object.entries(metrics).map(([k, v]: [string, any]) => [k, { health: v.health }])
        ) as Record<string, QueueHealthMetrics>
      ),
      queues: metrics,
    };
  }

  async getQueueHealthSummary() {
    const data = await this.getQueueMetrics();
    return {
      timestamp: data.timestamp,
      overall_health: data.overall_health,
      queue_health: Object.fromEntries(
        Object.entries((data as any).queues).map(([k, v]: [string, any]) => [k, v.health])
      ),
      performance: Object.fromEntries(
        Object.entries((data as any).queues).map(([k, v]: [string, any]) => [k, v.performance])
      )
    };
  }

  /**
   * Sample queue performance metrics.
   * In a production system you'd persist job timing metadata (enqueue -> active, active -> completed) either
   * via BullMQ events or job data augmentation. Here we approximate using last N completed jobs and simulated timestamps.
   */
  private async sampleQueuePerformance(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) return null;
    // Fetch a slice of recent completed & active jobs
  const completed = await queue.getCompleted(0, 50);
    const now = Date.now();

    const waitSamples: number[] = [];
    const processSamples: number[] = [];

    for (const job of completed) {
      // BullMQ doesn't store explicit start time by default; we approximate with timestamp (added) & finishedOn
      if (job.finishedOn) {
        const enqueueTs = job.timestamp; // when added
        const finishTs = job.finishedOn;
        const totalMs = finishTs - enqueueTs;
        // Heuristic: assume processing time is 60% of total, waiting 40% (placeholder until instrumentation added)
        const processMs = Math.max(1, totalMs * 0.6);
        const waitMs = Math.max(0, totalMs - processMs);
        waitSamples.push(waitMs);
        processSamples.push(processMs);
        this.metricsService.queueWaitTimeMs.observe({ queue: queueName }, waitMs);
        this.metricsService.queueProcessTimeMs.observe({ queue: queueName }, processMs);
      }
    }

    // Compute throughput: completed jobs finished in last 5 minutes / 5
    const windowMs = 5 * 60 * 1000;
    const recentCompleted = completed.filter(j => j.finishedOn && (now - j.finishedOn) < windowMs);
    const throughputPerMin = recentCompleted.length / 5;
    this.metricsService.queueThroughputPerMin.set({ queue: queueName }, throughputPerMin);

    return {
      samples: completed.length,
      throughput_per_min: throughputPerMin,
      wait_ms: this.basicStats(waitSamples),
      process_ms: this.basicStats(processSamples)
    };
  }

  private basicStats(arr: number[]) {
    if (arr.length === 0) return { p50: 0, p90: 0, p99: 0, avg: 0 };
    const sorted = [...arr].sort((a,b)=>a-b);
    const pct = (p: number) => sorted[Math.min(sorted.length-1, Math.floor(p/100 * sorted.length))];
    const sum = sorted.reduce((s,v)=>s+v,0);
    return {
      p50: pct(50),
      p90: pct(90),
      p99: pct(99),
      avg: sum / sorted.length
    };
  }

  /** Public method for explicit performance view */
  async getQueuePerformance() {
    const queues = ['cad:analyze','pdf:render','pricing:calculate'];
    const data: Record<string, any> = {};
    for (const q of queues) {
      data[q] = await this.sampleQueuePerformance(q);
    }
    return { timestamp: new Date().toISOString(), queues: data };
  }

  private calculateQueueHealth(counts: JobCounts): "healthy" | "degraded" | "unhealthy" {
    const { failed, delayed, waiting, paused, stalled } = counts;
    // Queue is unhealthy if:
    // - Has stalled jobs
    // - More than 10 failed jobs
    // - More than 100 delayed jobs
    if (stalled > 0 || failed > 10 || delayed > 100) {
      return "unhealthy";
    }

    // Queue is degraded if:
    // - More than 5 failed jobs
    // - More than 50 delayed jobs
    // - More than 1000 waiting jobs
    // - Is paused
    if (failed > 5 || delayed > 50 || waiting > 1000 || paused > 0) {
      return "degraded";
    }

    return "healthy";
  }

  private calculateOverallHealth(metrics: Record<string, QueueHealthMetrics>): QueueHealth {
    const healths = Object.values(metrics).map((m) => m.health);

    if (healths.includes("unhealthy")) {
      return "unhealthy";
    }
    if (healths.includes("degraded")) {
      return "degraded";
    }
    return "healthy";
  }
}
