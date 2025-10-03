/**
 * Step 18: Event Publisher
 * Publish job progress events to API WebSocket gateway
 */

import axios from 'axios';
import { getRedisClient } from '../lib/redis.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export type JobStatus =
  | 'queued'
  | 'active'
  | 'progress'
  | 'completed'
  | 'failed'
  | 'stalled'
  | 'retrying'
  | 'cancelled';

export interface ProgressPayload {
  job_id: string;
  status: JobStatus;
  progress: number; // 0-100
  message?: string;
  meta?: Record<string, any>;
  trace_id?: string;
  error?: string;
  result?: any;
}

/**
 * Publish progress event via Redis pub/sub
 * Channel: jobs:{org_id}:{job_id}
 */
export async function publishProgress(
  orgId: string,
  payload: ProgressPayload,
): Promise<void> {
  const redis = getRedisClient();
  const channel = `jobs:${orgId}:${payload.job_id}`;

  try {
    await redis.publish(channel, JSON.stringify(payload));
    logger.debug({ channel, status: payload.status }, 'Progress published');
  } catch (error) {
    logger.error({ error, channel }, 'Failed to publish progress');
    // Don't throw - progress publishing failures shouldn't fail the job
  }
}

/**
 * Publish progress event via HTTP to API WebSocket gateway
 * Fallback if Redis pub/sub not subscribed
 */
export async function publishProgressHttp(
  orgId: string,
  payload: ProgressPayload,
): Promise<void> {
  try {
    await axios.post(
      `${config.apiBaseUrl}/ws/job-events`,
      {
        org_id: orgId,
        ...payload,
      },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Secret': process.env.WORKER_SECRET || 'dev-secret',
        },
      },
    );
    logger.debug({ jobId: payload.job_id, status: payload.status }, 'Progress sent via HTTP');
  } catch (error) {
    logger.error({ error, jobId: payload.job_id }, 'Failed to publish progress via HTTP');
    // Don't throw
  }
}

/**
 * Publish both Redis and HTTP for redundancy
 */
export async function publishProgressBoth(
  orgId: string,
  payload: ProgressPayload,
): Promise<void> {
  await Promise.allSettled([
    publishProgress(orgId, payload),
    publishProgressHttp(orgId, payload),
  ]);
}
