/**
 * Step 18: Redis Connection Manager
 * Singleton Redis client and subscriber with graceful shutdown
 */

import Redis from 'ioredis';
import { config } from '../config.js';
import { logger } from './logger.js';

let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;

/**
 * Get or create Redis client for general operations
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ times, delay }, 'Redis connection retry');
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis client disconnected');
    });
  }

  return redisClient;
}

/**
 * Get or create Redis subscriber for pub/sub
 */
export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    redisSubscriber = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisSubscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });

    redisSubscriber.on('error', (err) => {
      logger.error({ err }, 'Redis subscriber error');
    });
  }

  return redisSubscriber;
}

/**
 * Close all Redis connections gracefully
 */
export async function closeRedis(): Promise<void> {
  logger.info('Closing Redis connections...');

  const promises: Promise<'OK'>[] = [];

  if (redisClient) {
    promises.push(redisClient.quit());
  }

  if (redisSubscriber) {
    promises.push(redisSubscriber.quit());
  }

  await Promise.all(promises);

  redisClient = null;
  redisSubscriber = null;

  logger.info('Redis connections closed');
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    return false;
  }
}
