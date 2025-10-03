/**
 * Step 18: Mesh Decimate Processor
 * Generate decimated mesh (LOD) for 3D viewer
 */

import { Job } from 'bullmq';
import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { publishProgressBoth } from '../events/publisher.js';

export type MeshQuality = 'low' | 'med' | 'high';

export interface MeshDecimatePayload {
  job_id: string;
  org_id: string;
  user_id: string;
  request_id?: string;
  part_id: string;
  mesh_quality: MeshQuality;
  file_hash: string;
  created_at: string;
}

export interface MeshDecimateResult {
  part_id: string;
  mesh_quality: MeshQuality;
  mesh_url: string;
  triangle_count: number;
  file_size_bytes: number;
}

/**
 * Process mesh-decimate job
 */
export async function processMeshDecimate(
  job: Job<MeshDecimatePayload>,
): Promise<MeshDecimateResult> {
  const { org_id, part_id, mesh_quality, file_hash, job_id } = job.data;

  logger.info(
    { jobId: job.id, partId: part_id, quality: mesh_quality },
    'Processing mesh-decimate',
  );

  try {
    await job.updateProgress(10);
    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'progress',
      progress: 10,
      message: `Generating ${mesh_quality} quality mesh...`,
      meta: { part_id, stage: 'generate' },
    });

    // Call CAD service to generate decimated mesh
    const meshResponse = await axios.post(
      `${config.cadServiceUrl}/mesh`,
      {
        file_hash,
        quality: mesh_quality,
        format: 'gltf', // or 'obj', 'stl'
      },
      {
        headers: {
          'X-Trace-Id': job.data.request_id || job.id,
        },
        timeout: 180000, // 3 minutes for complex meshes
      },
    );

    const meshData = meshResponse.data;

    await job.updateProgress(70);
    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'progress',
      progress: 70,
      message: 'Storing mesh...',
      meta: { part_id, stage: 'store' },
    });

    // Store mesh metadata in database
    await axios.put(
      `${config.apiBaseUrl}/parts/${part_id}/mesh`,
      {
        mesh_quality,
        mesh_url: meshData.url,
        triangle_count: meshData.triangle_count,
        file_size_bytes: meshData.file_size,
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

    const result: MeshDecimateResult = {
      part_id,
      mesh_quality,
      mesh_url: meshData.url,
      triangle_count: meshData.triangle_count,
      file_size_bytes: meshData.file_size,
    };

    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'completed',
      progress: 100,
      message: 'Mesh generation completed',
      result,
    });

    logger.info({ jobId: job.id, partId: part_id }, 'Mesh-decimate completed');

    return result;
  } catch (error: any) {
    logger.error({ error, jobId: job.id, partId: part_id }, 'Mesh-decimate failed');

    await publishProgressBoth(org_id, {
      job_id: job_id || job.id!,
      status: 'failed',
      progress: job.progress || 0,
      message: error.message,
      error: error.message,
    });

    throw error;
  }
}
