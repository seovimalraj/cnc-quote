/**
 * Step 18: Upload Parse Processor
 * Parse uploaded CAD file, extract metadata, compute file hash
 */

import { Job } from 'bullmq';
import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { publishProgressBoth } from '../events/publisher.js';

export interface UploadParsePayload {
  job_id: string;
  org_id: string;
  user_id: string;
  request_id?: string;
  file_id: string;
  file_hash: string;
  storage_url: string;
  filename: string;
  mime: string;
  created_at: string;
}

export interface UploadParseResult {
  file_id: string;
  file_hash: string;
  metadata: {
    filename: string;
    mime: string;
    size_bytes?: number;
    bounding_box?: {
      x: number;
      y: number;
      z: number;
    };
    part_count?: number;
    material?: string;
  };
  geometry_blob_url?: string;
}

/**
 * Process upload-parse job
 */
export async function processUploadParse(
  job: Job<UploadParsePayload>,
): Promise<UploadParseResult> {
  const { org_id, file_id, file_hash, storage_url, filename, mime, job_id } = job.data;

  logger.info({ jobId: job.id, fileId: file_id, filename }, 'Processing upload-parse');

  try {
    // Update progress: downloading
    await job.updateProgress(10);
    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'progress',
      progress: 10,
      message: 'Downloading file...',
      meta: { file_id, stage: 'download' },
    });

    // Download file from storage
    const fileResponse = await axios.get(storage_url, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    const fileBuffer = Buffer.from(fileResponse.data);

    // Verify file hash
    const computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    if (computedHash !== file_hash) {
      throw new Error(`File hash mismatch: expected ${file_hash}, got ${computedHash}`);
    }

    await job.updateProgress(30);
    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'progress',
      progress: 30,
      message: 'Parsing CAD file...',
      meta: { file_id, stage: 'parse' },
    });

    // Call CAD service to parse file
    const parseResponse = await axios.post(
      `${config.cadServiceUrl}/parse`,
      fileBuffer,
      {
        headers: {
          'Content-Type': mime,
          'X-Trace-Id': job.data.request_id || job.id,
          'X-Filename': filename,
        },
        timeout: 120000, // 2 minutes
        maxBodyLength: 100 * 1024 * 1024, // 100MB
      },
    );

    const parseData = parseResponse.data;

    await job.updateProgress(70);
    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'progress',
      progress: 70,
      message: 'Storing metadata...',
      meta: { file_id, stage: 'store' },
    });

    // Store metadata in database via API
    await axios.put(
      `${config.apiBaseUrl}/uploads/${file_id}/metadata`,
      {
        file_hash,
        bounding_box: parseData.bounding_box,
        part_count: parseData.part_count,
        material: parseData.material,
        geometry_blob_url: parseData.geometry_url,
      },
      {
        headers: {
          'X-Org-Id': org_id,
          'X-User-Id': job.data.user_id,
          'X-Worker-Secret': process.env.WORKER_SECRET || 'dev-secret',
        },
        timeout: 10000,
      },
    );

    await job.updateProgress(100);

    const result: UploadParseResult = {
      file_id,
      file_hash,
      metadata: {
        filename,
        mime,
        size_bytes: fileBuffer.length,
        bounding_box: parseData.bounding_box,
        part_count: parseData.part_count,
        material: parseData.material,
      },
      geometry_blob_url: parseData.geometry_url,
    };

    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'completed',
      progress: 100,
      message: 'Parse completed',
      result,
    });

    logger.info({ jobId: job.id, fileId: file_id }, 'Upload-parse completed');

    return result;
  } catch (error: any) {
    logger.error({ error, jobId: job.id, fileId: file_id }, 'Upload-parse failed');

    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'failed',
      progress: typeof (job as any).progress === 'number' ? (job as any).progress : 0,
      message: error.message,
      error: error.message,
    });

    throw error;
  }
}
