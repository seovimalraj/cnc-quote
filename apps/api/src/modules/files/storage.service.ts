import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { v4 as uuid } from 'uuid';

const UPLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hour
const DEFAULT_BUCKET = 'cad-files';

type InitiateUploadParams = {
  org_id: string;
  filename: string;
  size?: number;
  content_type?: string;
  sensitivity?: 'standard' | 'itar' | 'cui';
  linked_type?: string | null;
  linked_id?: string | null;
};

type CompleteUploadParams = {
  sha256?: string;
  quote_id?: string;
  quote_item_id?: string;
  linked_type?: string | null;
  linked_id?: string | null;
};

type DirectUploadArgs = {
  org_id: string;
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  } | null;
  sensitivity?: 'standard' | 'itar' | 'cui';
  linked_type?: string | null;
  linked_id?: string | null;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Initiate an upload returning file metadata row + signed upload details.
   */
  async initiateUpload(params: InitiateUploadParams) {
    if (!params.org_id) {
      throw new Error('org_id is required');
    }
    const id = uuid();
    const now = new Date();
    const bucket = DEFAULT_BUCKET;
    const safeFilename = this.sanitizeFilename(params.filename);
    const path = `${params.org_id}/${id}/${safeFilename}`;

    const bucketClient = this.supabase.client.storage.from(bucket) as any;
    const { data: signedUpload, error: signedUploadError } = await bucketClient
      .createSignedUploadUrl(path, UPLOAD_URL_TTL_SECONDS);

    if (signedUploadError) {
      this.logger.error(`Failed to create signed upload URL for ${path}: ${signedUploadError.message}`);
      throw signedUploadError;
    }

    const insertPayload = {
      id,
      org_id: params.org_id,
      bucket,
      path,
      name: params.filename,
      mime: params.content_type || 'application/octet-stream',
      size_bytes: params.size || 0,
      checksum_sha256: null,
      virus_scan: 'pending',
      sensitivity: params.sensitivity || 'standard',
      linked_type: params.linked_type || null,
      linked_id: params.linked_id || null,
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data: fileRow, error } = await this.supabase.client
      .from('files')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to insert file metadata for ${params.filename}: ${error.message}`);
      throw error;
    }

    return {
      file: fileRow,
      upload: {
        method: 'PUT',
        url: signedUpload.signedUrl,
        token: signedUpload.token,
        bucket,
        path,
        headers: {
          'content-type': params.content_type || 'application/octet-stream',
        },
      },
    };
  }

  /**
   * Mark upload complete and transition status. Could enqueue DFM/CAD jobs.
   */
  async completeUpload(fileId: string, orgId?: string, extra?: CompleteUploadParams) {
    const now = new Date();

    const query = this.supabase.client
      .from('files')
      .select('bucket, path, name, org_id')
      .eq('id', fileId);

    if (orgId) {
      query.eq('org_id', orgId);
    }

    const { data: existing, error: fetchError } = await query.single();

    if (fetchError) {
      this.logger.error(`Failed to fetch file ${fileId} before completion: ${fetchError.message}`);
      throw fetchError;
    }

    const download = await this.generateDownloadUrl(existing.bucket, existing.path, existing.name);

    const updatePayload = {
      virus_scan: 'scanning',
      checksum_sha256: extra?.sha256 || null,
      linked_id: extra?.quote_item_id || extra?.linked_id || null,
      linked_type: extra?.quote_item_id ? 'quote_item' : extra?.linked_type || null,
      signed_url: download.url,
      signed_url_expires_at: download.expires_at.toISOString(),
      uploaded_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const updateQuery = this.supabase.client
      .from('files')
      .update(updatePayload)
      .eq('id', fileId);

    if (orgId) {
      updateQuery.eq('org_id', orgId);
    }

    const { data: file, error } = await updateQuery.select().single();

    if (error) {
      this.logger.error(`Failed to mark file ${fileId} as uploaded: ${error.message}`);
      throw error;
    }

    // Enqueue geometry analysis if file is linked to a quote item
    if (file.linked_type === 'quote_item' && file.linked_id) {
      await this.enqueueGeometryAnalysis(fileId, file.name);
    }

    return { file };
  }

  /**
   * Enqueue geometry analysis job for uploaded CAD file
   */
  private async enqueueGeometryAnalysis(fileId: string, filename: string) {
    try {
      this.logger.log(`Enqueueing geometry analysis for file ${fileId}: ${filename}`);

      // In production, this would enqueue a BullMQ job:
      // const filePath = `/uploads/${fileId}/${filename}`;
      // await this.geometryQueue.add('analyze', { fileId, filePath });

      // For now, just log the action
      this.logger.log(`Geometry analysis queued for file ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to enqueue geometry analysis for file ${fileId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get signed URL for downloading a file
   */
  async getDownloadUrl(fileId: string, orgId?: string): Promise<{ url: string; expires_at: Date }> {
    const queryBuilder = this.supabase.client
      .from('files')
      .select('id, name, bucket, path, org_id')
      .eq('id', fileId);

    if (orgId) {
      queryBuilder.eq('org_id', orgId);
    }

    const { data: file, error } = await queryBuilder.single();
    if (error) throw error;

    return this.generateDownloadUrl(file.bucket, file.path, file.name);
  }

  /**
   * Get file metadata by ID
   */
  async getFileById(fileId: string, orgId?: string) {
    const queryBuilder = this.supabase.client
      .from('files')
      .select('*')
      .eq('id', fileId);

    if (orgId) {
      queryBuilder.eq('org_id', orgId);
    }

    const { data: file, error } = await queryBuilder.single();
    if (error) throw error;

    return file;
  }

  /**
   * Direct upload helper for handling multipart uploads.
   */
  async directUpload(params: DirectUploadArgs) {
    if (!params.org_id) {
      throw new Error('org_id is required for direct upload');
    }
    if (!params.file) {
      throw new Error('File payload missing');
    }

    const { file: record, upload } = await this.initiateUpload({
      org_id: params.org_id,
      filename: params.file.originalname,
      size: params.file.size,
      content_type: params.file.mimetype,
      sensitivity: params.sensitivity,
      linked_type: params.linked_type,
      linked_id: params.linked_id,
    });

    const bucketClient = this.supabase.client.storage.from(upload.bucket) as any;
    const { error: uploadError } = await bucketClient.upload(upload.path, params.file.buffer, {
      contentType: params.file.mimetype || 'application/octet-stream',
      upsert: true,
    });

    if (uploadError) {
      this.logger.error(`Direct upload failed for file ${record.id}: ${uploadError.message}`);
      await this.supabase.client.from('files').delete().eq('id', record.id);
      throw uploadError;
    }

    return this.completeUpload(record.id, {
      linked_type: params.linked_type,
      linked_id: params.linked_id,
    });
  }

  private sanitizeFilename(filename: string) {
    const parts = filename.split('.');
    const extension = parts.length > 1 ? parts.pop() : '';
    const base = parts.join('.') || 'file';
    const sanitizedBase = base.replace(/[^a-zA-Z0-9-_]+/g, '_');
    const sanitizedExt = (extension || '').replace(/[^a-zA-Z0-9]+/g, '');
    return sanitizedExt ? `${sanitizedBase}.${sanitizedExt}` : sanitizedBase;
  }

  private async generateDownloadUrl(bucket: string, path: string, filename: string) {
    const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000);
    const bucketClient = this.supabase.client.storage.from(bucket) as any;
    const { data, error } = await bucketClient
      .createSignedUrl(path, UPLOAD_URL_TTL_SECONDS, { download: filename });

    if (error) {
      this.logger.error(`Failed to create download URL for ${path}: ${error.message}`);
      throw error;
    }

    return { url: data.signedUrl, expires_at: expiresAt };
  }
}
