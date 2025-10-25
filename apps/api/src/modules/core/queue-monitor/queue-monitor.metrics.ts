export interface JobCounts {
  [key: string]: number;
}

export type QueueHealth = "healthy" | "degraded" | "unhealthy";

export interface QueueMetrics {
  metrics: Record<string, QueueHealthMetrics>;
  timestamp: string;
  overall_health: QueueHealth;
}

export interface QueueHealthMetrics {
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  waiting: number;
  paused: number;
  stalled: number;
  health: QueueHealth;
}
