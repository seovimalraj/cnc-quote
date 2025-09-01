import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QueueJobData, QueueStats } from "./queue-monitor.types";
import { JobCounts, QueueHealth, QueueMetrics as _QueueMetrics, QueueHealthMetrics } from "./queue-monitor.metrics";

@Injectable()
export class QueueMonitorService {
  constructor(
    @InjectQueue("cad") private readonly cadQueue: Queue,
    @InjectQueue("pricing") private readonly pricingQueue: Queue,
    @InjectQueue("email") private readonly emailQueue: Queue,
  ) {}

  async getQueueCounts(): Promise<Record<string, JobCounts>> {
    const [cad, pricing, email] = await Promise.all([
      this.cadQueue.getJobCounts(),
      this.pricingQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
    ]);

    return {
      cad,
      pricing,
      email,
    };
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
      metrics: queueMetrics,
      timestamp: new Date().toISOString(),
      overall_health: this.calculateOverallHealth(queueMetrics),
    };
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
