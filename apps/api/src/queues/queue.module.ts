/**
 * Step 18: Queue Module (Producer Side)
 * NestJS module for enqueuing jobs to BullMQ
 * NOTE: This is the PRODUCER side - workers run in separate service
 */

import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

/**
 * Redis connection for job producers
 */
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

/**
 * Queue instances for job producers
 */
export const uploadParseQueue = new Queue('upload-parse', {
  connection: redisClient,
});

export const meshDecimateQueue = new Queue('mesh-decimate', {
  connection: redisClient,
});

export const priceBatchQueue = new Queue('price-batch', {
  connection: redisClient,
});

@Module({
  providers: [
    {
      provide: 'UPLOAD_PARSE_QUEUE',
      useValue: uploadParseQueue,
    },
    {
      provide: 'MESH_DECIMATE_QUEUE',
      useValue: meshDecimateQueue,
    },
    {
      provide: 'PRICE_BATCH_QUEUE',
      useValue: priceBatchQueue,
    },
  ],
  exports: [
    'UPLOAD_PARSE_QUEUE',
    'MESH_DECIMATE_QUEUE',
    'PRICE_BATCH_QUEUE',
  ],
})
export class QueueModule {}
