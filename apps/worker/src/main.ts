/**
 * Step 18: Worker Service Main Entry Point
 * Bootstrap worker service with graceful shutdown
 */

import { initOtel, shutdownOtel } from './lib/otel.js';
import { getRedisClient, closeRedis } from './lib/redis.js';
import { registerAllWorkers, closeAllWorkers } from './queues/index.js';
import { startHealthServer } from './lib/health.js';
import { logger } from './lib/logger.js';
import { config } from './config.js';

/**
 * Bootstrap worker service
 */
async function bootstrap(): Promise<void> {
  logger.info('🚀 Starting CNC Quote Worker Service...');

  // Initialize OpenTelemetry
  initOtel();

  try {
    // Connect to Redis
    const redis = getRedisClient();
    await redis.ping();
    logger.info('✅ Redis connected');

    // Register all workers
  await registerAllWorkers();
    logger.info('✅ Workers registered');

    // Start health check server
    await startHealthServer();
    logger.info('✅ Health server started');

    logger.info({
      config: {
        workerConcurrency: config.workerConcurrency,
        maxAttempts: config.workerMaxAttempts,
        jobTtl: config.jobTtlSeconds,
        nodeEnv: config.nodeEnv,
      },
    }, '✅ Worker service ready');
  } catch (error) {
    logger.error({ error }, '❌ Failed to start worker service');
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, '⏳ Shutting down gracefully...');

  try {
    // Close workers (wait for active jobs to complete)
    await closeAllWorkers();

    // Close Redis connections
    await closeRedis();

    // Shutdown OpenTelemetry
    await shutdownOtel();

    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Error during shutdown');
    process.exit(1);
  }
}

/**
 * Register signal handlers
 */
function registerSignalHandlers(): void {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}

/**
 * Main
 */
async function main(): Promise<void> {
  registerSignalHandlers();
  await bootstrap();
}

// Start the service
main().catch((error) => {
  logger.error({ error }, 'Fatal error');
  process.exit(1);
});
