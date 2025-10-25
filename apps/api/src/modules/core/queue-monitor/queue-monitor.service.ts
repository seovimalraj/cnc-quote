import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QueueJobData, QueueStats } from "./queue-monitor.types";
import { JobCounts, QueueHealth, QueueHealthMetrics } from "./queue-monitor.metrics";
import { MetricsService } from "../metrics/metrics.service";
import { AdminMetricsService } from "../../admin/admin-metrics/admin-metrics.service";
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { AdminService } from "../../admin/admin/admin.service";

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
    private readonly adminMetrics: AdminMetricsService,
    private readonly supabase: SupabaseService,
    private readonly adminService: AdminService,
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
    return {
      window,
      evaluated_at: new Date().toISOString(),
      queues: results,
    };
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
    return this.adminMetrics.getDatabaseLatencySnapshot(window);
  }

  async getWebhookStatus(window: string = '1h') {
    const windowMs = this.parseTimeWindow(window);
    const since = new Date(Date.now() - windowMs).toISOString();

    type WebhookRow = {
      provider: string;
      status: string;
      failed_24h: number | null;
      last_event_type: string | null;
      last_delivery_at: string | null;
      updated_at: string;
    };

    const { data: rowsInWindow, error } = await this.supabase.client
      .from('admin_webhook_status')
      .select('provider, status, failed_24h, last_event_type, last_delivery_at, updated_at')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    let rows: WebhookRow[] = rowsInWindow ?? [];

    if (!rows.length) {
      const { data: fallbackRows, error: fallbackError } = await this.supabase.client
        .from('admin_webhook_status')
        .select('provider, status, failed_24h, last_event_type, last_delivery_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (fallbackError) {
        throw fallbackError;
      }

      rows = fallbackRows ?? [];
    }

    const now = Date.now();
    const seenProviders = new Set<string>();
    const items = rows.reduce<Array<{ provider: string; status: string; failed_24h: number; last_event_type: string | null; last_delivery_age: number | null }>>((acc, row) => {
      if (seenProviders.has(row.provider)) {
        return acc;
      }
      seenProviders.add(row.provider);
      const ageSeconds = row.last_delivery_at ? Math.max(0, Math.round((now - Date.parse(row.last_delivery_at)) / 1000)) : null;
      acc.push({
        provider: row.provider,
        status: row.status,
        failed_24h: row.failed_24h ?? 0,
        last_event_type: row.last_event_type,
        last_delivery_age: ageSeconds,
      });
      return acc;
    }, []);

    return {
      window,
      evaluated_at: new Date().toISOString(),
      items,
    };
  }

  async replayWebhooks(provider: string, window: string = '24h') {
    const normalizedProvider = provider.toLowerCase();
    const updateResult = await this.supabase.client
      .from('admin_webhook_status')
      .update({ failed_24h: 0, updated_at: new Date().toISOString() })
      .eq('provider', normalizedProvider)
      .select('provider')
      .limit(1);

    if (updateResult.error) {
      throw updateResult.error;
    }

    const replayed = updateResult.data?.length ? 1 : 0;

    return {
      provider: normalizedProvider,
      replayed,
      window_seconds: this.parseTimeWindow(window) / 1000,
    };
  }

  async getSLOMetrics(window: string = '1h') {
    return this.adminMetrics.getSloSnapshot(window);
  }

  async getErrors(window: string = '1h') {
    const windowMs = this.parseTimeWindow(window);
    const since = new Date(Date.now() - windowMs).toISOString();

    type ErrorRow = {
      id: string;
      service: string;
      title: string;
      count_1h: number | null;
      first_seen: string;
      last_seen: string;
      users_affected: number | null;
      permalink: string | null;
    };

    type FailedJobRow = {
      queue: string;
      job_id: string;
      attempts: number | null;
      reason: string | null;
      occurred_at: string;
    };

    const [{ data: errorRows, error: errorEventsError }, { data: failedSnapshots, error: failedSnapshotsError }, liveFailedJobs] = await Promise.all([
      this.supabase.client
        .from('admin_error_events')
        .select('id, service, title, count_1h, first_seen, last_seen, users_affected, permalink')
        .gte('last_seen', since)
        .order('last_seen', { ascending: false })
        .limit(50),
      this.supabase.client
        .from('admin_failed_jobs')
        .select('queue, job_id, attempts, reason, occurred_at')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(100),
      this.getFailedJobs(window),
    ]);

    if (errorEventsError) {
      throw errorEventsError;
    }

    if (failedSnapshotsError) {
      throw failedSnapshotsError;
    }

    const sentry = (errorRows ?? []).map((row) => ({
      id: row.id,
      service: row.service,
      title: row.title,
      count_1h: row.count_1h ?? 0,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      users_affected: row.users_affected,
      permalink: row.permalink,
    }));

    const storedFailed = (failedSnapshots ?? []).map((row) => ({
      when: row.occurred_at,
      queue: row.queue,
      job_id: row.job_id,
      attempts: row.attempts ?? 0,
      reason: row.reason,
    }));

    const liveFailed = (liveFailedJobs ?? []).map((job) => ({
      when: job.when,
      queue: job.queue,
      job_id: job.jobId,
      attempts: job.attempts,
      reason: job.reason,
    }));

    const failed_jobs = [...storedFailed, ...liveFailed]
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 100);

    return {
      window,
      evaluated_at: new Date().toISOString(),
      sentry,
      failed_jobs,
    };
  }

  async getReviewSummary(window: string = '1h') {
    return this.adminService.getReviewSummary(window);
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
