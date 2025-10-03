/**
 * Step 18: Health Check Server
 * Lightweight HTTP server for health probes and metrics
 */

import express from 'express';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { checkRedisHealth } from '../lib/redis.js';
import { getQueueHealth } from '../queues/index.js';

const app = express();

/**
 * Health check endpoint
 */
app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    const redisHealthy = await checkRedisHealth();
    const queues = await getQueueHealth();

    const status = redisHealthy ? 'healthy' : 'unhealthy';

    res.status(redisHealthy ? 200 : 503).json({
      status,
      redis: redisHealthy ? 'up' : 'down',
      queues,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness check (for k8s)
 */
app.get('/ready', async (req: express.Request, res: express.Response) => {
  try {
    const redisHealthy = await checkRedisHealth();
    if (redisHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'redis down' });
    }
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

/**
 * Liveness check (for k8s)
 */
app.get('/live', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * Start health check server
 */
export function startHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(config.healthPort, () => {
      logger.info({ port: config.healthPort }, 'Health server started');
      resolve();
    });
  });
}
