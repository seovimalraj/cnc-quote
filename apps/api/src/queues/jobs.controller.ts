/**
 * Step 18: Jobs Controller (Producer Side)
 * REST endpoints for enqueueing jobs with idempotency checks
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { createHash } from 'crypto';

/**
 * Redis client for idempotency checks
 */
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new Redis(redisUrl);

const JOB_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Idempotency key helpers
 */
function uploadParseKey(org_id: string, file_hash: string): string {
  return `upload-parse:${org_id}:${file_hash}`;
}

function meshDecimateKey(org_id: string, file_hash: string, quality: string): string {
  return `mesh-decimate:${org_id}:${file_hash}:${quality}`;
}

function priceBatchKey(org_id: string, batch_hash: string): string {
  return `price-batch:${org_id}:${batch_hash}`;
}

function computeBatchHash(quote_id: string, line_ids: string[], config: any): string {
  const canonical = JSON.stringify({
    quote_id,
    line_ids: line_ids.sort(),
    config: config || {},
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Set idempotency key with NX (only if not exists)
 */
async function setIdempotencyKey(
  key: string,
  jobId: string,
): Promise<{ isNew: boolean; existingJobId?: string }> {
  const result = await redisClient.set(key, jobId, 'EX', JOB_TTL_SECONDS, 'NX');

  if (result === 'OK') {
    return { isNew: true };
  } else {
    const existingJobId = await redisClient.get(key);
    return { isNew: false, existingJobId: existingJobId || undefined };
  }
}

@Controller('jobs')
export class JobsController {
  constructor(
    @Inject('UPLOAD_PARSE_QUEUE') private uploadParseQueue: Queue,
    @Inject('MESH_DECIMATE_QUEUE') private meshDecimateQueue: Queue,
    @Inject('PRICE_BATCH_QUEUE') private priceBatchQueue: Queue,
  ) {}

  /**
   * POST /jobs/upload-parse
   * Enqueue CAD file parsing job
   */
  @Post('upload-parse')
  async uploadParse(@Body() body: {
    org_id: string;
    file_id: string;
    file_hash: string;
    storage_url: string;
    trace_id?: string;
  }) {
    const { org_id, file_id, file_hash, storage_url, trace_id } = body;

    if (!org_id || !file_id || !file_hash || !storage_url) {
      throw new HttpException(
        'Missing required fields: org_id, file_id, file_hash, storage_url',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check idempotency
    const idempotencyKey = uploadParseKey(org_id, file_hash);
    const jobId = `upload-parse-${file_id}-${Date.now()}`;
    const { isNew, existingJobId } = await setIdempotencyKey(idempotencyKey, jobId);

    if (!isNew && existingJobId) {
      // Job already exists
      const existingJob = await this.uploadParseQueue.getJob(existingJobId);
      if (existingJob) {
        const state = await existingJob.getState();
        return {
          job_id: existingJobId,
          status: state,
          duplicate: true,
        };
      }
    }

    // Enqueue new job
    const job = await this.uploadParseQueue.add(
      'upload-parse',
      { org_id, file_id, file_hash, storage_url },
      {
        jobId,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return {
      job_id: job.id,
      status: 'queued',
      trace_id,
    };
  }

  /**
   * POST /jobs/mesh-decimate
   * Enqueue mesh decimation job
   */
  @Post('mesh-decimate')
  async meshDecimate(@Body() body: {
    org_id: string;
    part_id: string;
    file_hash: string;
    mesh_quality: 'low' | 'med' | 'high';
    trace_id?: string;
  }) {
    const { org_id, part_id, file_hash, mesh_quality, trace_id } = body;

    if (!org_id || !part_id || !file_hash || !mesh_quality) {
      throw new HttpException(
        'Missing required fields: org_id, part_id, file_hash, mesh_quality',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check idempotency
    const idempotencyKey = meshDecimateKey(org_id, file_hash, mesh_quality);
    const jobId = `mesh-decimate-${part_id}-${mesh_quality}-${Date.now()}`;
    const { isNew, existingJobId } = await setIdempotencyKey(idempotencyKey, jobId);

    if (!isNew && existingJobId) {
      const existingJob = await this.meshDecimateQueue.getJob(existingJobId);
      if (existingJob) {
        const state = await existingJob.getState();
        return {
          job_id: existingJobId,
          status: state,
          duplicate: true,
        };
      }
    }

    // Enqueue new job
    const job = await this.meshDecimateQueue.add(
      'mesh-decimate',
      { org_id, part_id, file_hash, mesh_quality },
      {
        jobId,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return {
      job_id: job.id,
      status: 'queued',
      trace_id,
    };
  }

  /**
   * POST /jobs/price-batch
   * Enqueue batch pricing job
   */
  @Post('price-batch')
  async priceBatch(@Body() body: {
    org_id: string;
    quote_id: string;
    line_ids: string[];
    config?: any;
    trace_id?: string;
  }) {
    const { org_id, quote_id, line_ids, config, trace_id } = body;

    if (!org_id || !quote_id || !line_ids || !Array.isArray(line_ids) || line_ids.length === 0) {
      throw new HttpException(
        'Missing required fields: org_id, quote_id, line_ids (non-empty array)',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check idempotency
    const batch_hash = computeBatchHash(quote_id, line_ids, config);
    const idempotencyKey = priceBatchKey(org_id, batch_hash);
    const jobId = `price-batch-${quote_id}-${Date.now()}`;
    const { isNew, existingJobId } = await setIdempotencyKey(idempotencyKey, jobId);

    if (!isNew && existingJobId) {
      const existingJob = await this.priceBatchQueue.getJob(existingJobId);
      if (existingJob) {
        const state = await existingJob.getState();
        return {
          job_id: existingJobId,
          status: state,
          duplicate: true,
        };
      }
    }

    // Enqueue new job
    const job = await this.priceBatchQueue.add(
      'price-batch',
      { org_id, quote_id, line_ids, config: config || {} },
      {
        jobId,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );

    return {
      job_id: job.id,
      status: 'queued',
      trace_id,
      batch_hash,
    };
  }

  /**
   * GET /jobs/:id
   * Get job status and result
   */
  @Get(':id')
  async getJob(@Param('id') jobId: string) {
    // Try all queues
    const queues = [
      this.uploadParseQueue,
      this.meshDecimateQueue,
      this.priceBatchQueue,
    ];

    for (const queue of queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        return {
          job_id: job.id,
          status: state,
          progress: job.progress,
          data: job.data,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade,
        };
      }
    }

    throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
  }
}
