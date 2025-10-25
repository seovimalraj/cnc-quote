// Legacy Bull types removed; using internal interfaces only to decouple from implementation

export interface QueueConfig {
  name: string;
  hostId: string;
  prefix?: string;
  redis?: {
    host: string;
    port: number;
  };
}

export interface QueueJobData {
  id: string;
  name: string;
  queue: string;
  status: string;
  timestamp: number;
  data: Record<string, unknown>;
  result?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface QueueJobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface QueueStats {
  queue: string;
  counts: QueueJobCounts;
  jobs: {
    active: QueueJobData[];
    waiting: QueueJobData[];
    failed: QueueJobData[];
  };
}

export interface QueueMetrics {
  timestamp: number;
  queues: Record<string, QueueStats>;
}
