/**
 * Step 18: Queue and Worker Registration
 * Register BullMQ workers for each queue type
 */

import { Worker, Queue, QueueScheduler } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { processUploadParse, UploadParsePayload } from '../processors/upload-parse.js';
import { processMeshDecimate, MeshDecimatePayload } from '../processors/mesh-decimate.js';
import { processPriceBatch, PriceBatchPayload } from '../processors/price-batch.js';
import { processComplianceAnalytics, ComplianceAnalyticsPayload } from '../processors/compliance-analytics.js';
import { processPricingRationale, PricingRationalePayload } from '../processors/pricing-rationale.js';

const workers: Worker[] = [];
const schedulers: QueueScheduler[] = [];
const queues: Queue[] = [];
let complianceAnalyticsQueue: Queue<ComplianceAnalyticsPayload> | null = null;

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

export function registerPricingRationaleWorker(): Worker {
  const worker = new Worker<PricingRationalePayload>(
    'pricing-rationale',
    async (job: any) => {
      logger.info({ jobId: job.id, queue: 'pricing-rationale', quoteId: job.data?.quoteId }, 'Job started');
      return processPricingRationale(job);
    },
    {
      ...createWorkerOptions(1, config.workerMaxAttempts),
      autorun: true,
    },
  );

  worker.on('completed', (job: any) => {
    logger.info({ jobId: job.id, queue: 'pricing-rationale' }, 'Job completed');
  });

  worker.on('failed', (job: any, err: Error) => {
    logger.error({ jobId: job?.id, queue: 'pricing-rationale', error: err.message }, 'Job failed');
  });

  worker.on('error', (err: Error) => {
    logger.error({ queue: 'pricing-rationale', error: err }, 'Worker error');
  });

  workers.push(worker);
  logger.info('✅ Registered pricing-rationale worker');
  return worker;
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

function ensureComplianceAnalyticsQueue(): Queue<ComplianceAnalyticsPayload> {
  if (!complianceAnalyticsQueue) {
    complianceAnalyticsQueue = new Queue<ComplianceAnalyticsPayload>('compliance-analytics', {
      connection: getRedisClient(),
    });
    queues.push(complianceAnalyticsQueue);
  }
  return complianceAnalyticsQueue;
}

async function scheduleComplianceAnalyticsJob(queue: Queue<ComplianceAnalyticsPayload>): Promise<void> {
  try {
    await queue.add(
      'compliance-analytics-nightly',
      { windowHours: 24 },
      {
        jobId: 'compliance-analytics:nightly',
        repeat: {
          pattern: config.complianceRollupCron,
          tz: 'UTC',
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
    logger.info({ cron: config.complianceRollupCron }, 'Scheduled nightly compliance analytics rollup');
  } catch (error: any) {
    if (!String(error?.message || '').includes('already exists')) {
      logger.warn({ error }, 'Failed to schedule compliance analytics rollup');
    }
  }
}

export async function registerComplianceAnalyticsWorker(): Promise<Worker> {
  const worker = new Worker<ComplianceAnalyticsPayload>(
    'compliance-analytics',
    async (job: any) => {
      logger.info({ jobId: job.id, queue: 'compliance-analytics' }, 'Job started');
      return processComplianceAnalytics(job);
    },
    {
      ...createWorkerOptions(1, config.workerMaxAttempts),
      autorun: true,
    },
  );

  worker.on('completed', (job: any) => {
    logger.info({ jobId: job.id, queue: 'compliance-analytics' }, 'Job completed');
  });

  worker.on('failed', (job: any, err: Error) => {
    logger.error(
      { jobId: job?.id, queue: 'compliance-analytics', error: err.message },
      'Job failed',
    );
  });

  worker.on('error', (err: Error) => {
    logger.error({ queue: 'compliance-analytics', error: err }, 'Worker error');
  });

  const scheduler = new QueueScheduler('compliance-analytics', {
    connection: getRedisClient(),
  });
  await scheduler.waitUntilReady();
  schedulers.push(scheduler);

  const queue = ensureComplianceAnalyticsQueue();
  await queue.waitUntilReady();
  await scheduleComplianceAnalyticsJob(queue);

  workers.push(worker);
  logger.info('✅ Registered compliance-analytics worker');
  return worker;
}

/**
 * Register all workers
 */
export async function registerAllWorkers(): Promise<void> {
  registerUploadParseWorker();
  registerMeshDecimateWorker();
  registerPriceBatchWorker();
  registerPricingRationaleWorker();
  await registerComplianceAnalyticsWorker();
  logger.info('✅ All workers registered');
}

/**
 * Close all workers gracefully
 */
export async function closeAllWorkers(): Promise<void> {
  logger.info('⏳ Closing workers...');
  await Promise.all([
    ...workers.map((w) => w.close()),
    ...schedulers.map((s) => s.close()),
    ...queues.map((q) => q.close()),
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
  const rationaleQueue = new Queue('pricing-rationale', { connection: redis });

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

  const [rationaleWaiting, rationaleActive, rationaleCompleted, rationaleFailed] =
    await Promise.all([
      rationaleQueue.getWaitingCount(),
      rationaleQueue.getActiveCount(),
      rationaleQueue.getCompletedCount(),
      rationaleQueue.getFailedCount(),
    ]);

  const complianceQueue = ensureComplianceAnalyticsQueue();
  const [complianceWaiting, complianceActive, complianceCompleted, complianceFailed] =
    await Promise.all([
      complianceQueue.getWaitingCount(),
      complianceQueue.getActiveCount(),
      complianceQueue.getCompletedCount(),
      complianceQueue.getFailedCount(),
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
    'pricing-rationale': {
      waiting: rationaleWaiting,
      active: rationaleActive,
      completed: rationaleCompleted,
      failed: rationaleFailed,
    },
    'compliance-analytics': {
      waiting: complianceWaiting,
      active: complianceActive,
      completed: complianceCompleted,
      failed: complianceFailed,
    },
  };
}

export async function enqueueComplianceAnalyticsRun(
  payload: ComplianceAnalyticsPayload = {},
): Promise<void> {
  const queue = ensureComplianceAnalyticsQueue();
  await queue.add('compliance-analytics-on-demand', payload, {
    jobId: `compliance-analytics:on-demand:${Date.now()}`,
    removeOnComplete: true,
    removeOnFail: 10,
  });
  logger.info('Enqueued on-demand compliance analytics rollup');
}
