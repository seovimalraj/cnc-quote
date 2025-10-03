/**
 * Step 18: Queue and Worker Registration
 * Register BullMQ workers for each queue type
 */

import { Worker, Queue, QueueEvents } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { processUploadParse, UploadParsePayload } from '../processors/upload-parse.js';
import { processMeshDecimate, MeshDecimatePayload } from '../processors/mesh-decimate.js';
import { processPriceBatch, PriceBatchPayload } from '../processors/price-batch.js';

const workers: Worker[] = [];
const queueEvents: QueueEvents[] = [];

/**
 * Create worker configuration
 */
function createWorkerOptions(concurrency: number, attempts: number) {
  return {
    connection: getRedisClient(),
    concurrency,
    limiter: {
      max: 20,
      duration: 1000,
    },
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // Exponential backoff: 5s, 10s, 20s, 40s, 80s (capped at 120s)
        return Math.min(5000 * Math.pow(2, attemptsMade), 120000);
      },
    },
  };
}

/**
 * Register upload-parse worker
 */
export function registerUploadParseWorker(): Worker {
  const worker = new Worker<UploadParsePayload>(
    'upload-parse',
    async (job: any) => {
      logger.info({ jobId: job.id, queue: 'upload-parse' }, 'Job started');
      return processUploadParse(job);
    },
    {
      ...createWorkerOptions(config.workerConcurrency, config.workerMaxAttempts),
      autorun: true,
    },
  );

  worker.on('completed', (job: any) => {
    logger.info({ jobId: job.id, queue: 'upload-parse' }, 'Job completed');
  });

  worker.on('failed', (job: any, err: Error) => {
    logger.error(
      { jobId: job?.id, queue: 'upload-parse', error: err.message },
      'Job failed',
    );
  });

  worker.on('error', (err: Error) => {
    logger.error({ queue: 'upload-parse', error: err }, 'Worker error');
  });

  workers.push(worker);
  logger.info('✅ Registered upload-parse worker');
  return worker;
}

/**
 * Register mesh-decimate worker
 */
export function registerMeshDecimateWorker(): Worker {
  const worker = new Worker<MeshDecimatePayload>(
    'mesh-decimate',
    async (job: any) => {
      logger.info({ jobId: job.id, queue: 'mesh-decimate' }, 'Job started');
      return processMeshDecimate(job);
    },
    {
      ...createWorkerOptions(config.workerConcurrency, config.workerMaxAttempts),
      limiter: {
        max: 10, // Lower rate limit for mesh generation
        duration: 1000,
      },
      autorun: true,
    },
  );

  worker.on('completed', (job: any) => {
    logger.info({ jobId: job.id, queue: 'mesh-decimate' }, 'Job completed');
  });

  worker.on('failed', (job: any, err: Error) => {
    logger.error(
      { jobId: job?.id, queue: 'mesh-decimate', error: err.message },
      'Job failed',
    );
  });

  worker.on('error', (err: Error) => {
    logger.error({ queue: 'mesh-decimate', error: err }, 'Worker error');
  });

  workers.push(worker);
  logger.info('✅ Registered mesh-decimate worker');
  return worker;
}

/**
 * Register price-batch worker
 */
export function registerPriceBatchWorker(): Worker {
  const worker = new Worker<PriceBatchPayload>(
    'price-batch',
    async (job: any) => {
      logger.info(
        {
          jobId: job.id,
          queue: 'price-batch',
          quote_id: job.data.quote_id,
          line_count: job.data.line_ids.length,
        },
        'Job started',
      );
      return processPriceBatch(job);
    },
    {
      connection: getRedisClient(),
      concurrency: 2, // Lower concurrency for batch jobs
      limiter: {
        max: 5, // Lower rate limit
        duration: 1000,
      },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Longer backoff for pricing: 10s, 20s, 40s, 80s, 160s (capped at 300s)
          return Math.min(10000 * Math.pow(2, attemptsMade), 300000);
        },
      },
      autorun: true,
    },
  );

  worker.on('completed', (job: any) => {
    logger.info({ jobId: job.id, queue: 'price-batch' }, 'Job completed');
  });

  worker.on('failed', (job: any, err: Error) => {
    logger.error(
      { jobId: job?.id, queue: 'price-batch', error: err.message },
      'Job failed',
    );
  });

  worker.on('error', (err: Error) => {
    logger.error({ queue: 'price-batch', error: err }, 'Worker error');
  });

  workers.push(worker);
  logger.info('✅ Registered price-batch worker');
  return worker;
}

/**
 * Register all workers
 */
export function registerAllWorkers(): void {
  registerUploadParseWorker();
  registerMeshDecimateWorker();
  registerPriceBatchWorker();
  logger.info('✅ All workers registered');
}

/**
 * Close all workers gracefully
 */
export async function closeAllWorkers(): Promise<void> {
  logger.info('⏳ Closing workers...');
  await Promise.all([
    ...workers.map((w) => w.close()),
  ]);
  logger.info('✅ All workers closed');
}

/**
 * Get queue health stats
 */
export async function getQueueHealth() {
  const redis = getRedisClient();

  const uploadQueue = new Queue('upload-parse', { connection: redis });
  const meshQueue = new Queue('mesh-decimate', { connection: redis });
  const priceQueue = new Queue('price-batch', { connection: redis });

  const [uploadWaiting, uploadActive, uploadCompleted, uploadFailed] =
    await Promise.all([
      uploadQueue.getWaitingCount(),
      uploadQueue.getActiveCount(),
      uploadQueue.getCompletedCount(),
      uploadQueue.getFailedCount(),
    ]);

  const [meshWaiting, meshActive, meshCompleted, meshFailed] =
    await Promise.all([
      meshQueue.getWaitingCount(),
      meshQueue.getActiveCount(),
      meshQueue.getCompletedCount(),
      meshQueue.getFailedCount(),
    ]);

  const [priceWaiting, priceActive, priceCompleted, priceFailed] =
    await Promise.all([
      priceQueue.getWaitingCount(),
      priceQueue.getActiveCount(),
      priceQueue.getCompletedCount(),
      priceQueue.getFailedCount(),
    ]);

  return {
    'upload-parse': {
      waiting: uploadWaiting,
      active: uploadActive,
      completed: uploadCompleted,
      failed: uploadFailed,
    },
    'mesh-decimate': {
      waiting: meshWaiting,
      active: meshActive,
      completed: meshCompleted,
      failed: meshFailed,
    },
    'price-batch': {
      waiting: priceWaiting,
      active: priceActive,
      completed: priceCompleted,
      failed: priceFailed,
    },
  };
}
