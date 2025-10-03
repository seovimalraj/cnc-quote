/**
 * Step 18: Idempotency Manager
 * Redis-based idempotency key management for job deduplication
 */

import { getRedisClient } from './redis.js';
import { config } from '../config.js';
import { logger } from './logger.js';

export interface IdempotencyResult {
  isNew: boolean;
  existingJobId?: string;
}

/**
 * Set idempotency key and return whether it's new
 * Uses Redis SET NX (set if not exists) with TTL
 */
export async function setIdempotencyKey(
  key: string,
  jobId: string,
): Promise<IdempotencyResult> {
  const redis = getRedisClient();
  const fullKey = `idempotency:${key}`;

  try {
    // SET NX EX: Set if not exists with expiry in seconds
    const result = await redis.set(
      fullKey,
      jobId,
      'EX',
      config.jobTtlSeconds,
      'NX',
    );

    if (result === 'OK') {
      // Key was set (didn't exist before)
      logger.debug({ key, jobId }, 'Idempotency key created');
      return { isNew: true };
    } else {
      // Key already exists, get the existing job ID
      const existingJobId = await redis.get(fullKey);
      logger.debug({ key, existingJobId, newJobId: jobId }, 'Idempotency key exists');
      return {
        isNew: false,
        existingJobId: existingJobId || undefined,
      };
    }
  } catch (error) {
    logger.error({ error, key }, 'Failed to set idempotency key');
    throw error;
  }
}

/**
 * Get job ID for an idempotency key
 */
export async function getIdempotencyKey(key: string): Promise<string | null> {
  const redis = getRedisClient();
  const fullKey = `idempotency:${key}`;

  try {
    return await redis.get(fullKey);
  } catch (error) {
    logger.error({ error, key }, 'Failed to get idempotency key');
    throw error;
  }
}

/**
 * Delete idempotency key (useful for retry scenarios)
 */
export async function deleteIdempotencyKey(key: string): Promise<void> {
  const redis = getRedisClient();
  const fullKey = `idempotency:${key}`;

  try {
    await redis.del(fullKey);
    logger.debug({ key }, 'Idempotency key deleted');
  } catch (error) {
    logger.error({ error, key }, 'Failed to delete idempotency key');
    throw error;
  }
}

/**
 * Generate idempotency key for upload-parse job
 */
export function uploadParseKey(orgId: string, fileHash: string): string {
  return `upload-parse:${orgId}:${fileHash}`;
}

/**
 * Generate idempotency key for mesh-decimate job
 */
export function meshDecimateKey(
  orgId: string,
  fileHash: string,
  meshQuality: string,
): string {
  return `mesh-decimate:${orgId}:${fileHash}:${meshQuality}`;
}

/**
 * Generate idempotency key for price-batch job
 */
export function priceBatchKey(orgId: string, batchHash: string): string {
  return `price-batch:${orgId}:${batchHash}`;
}
