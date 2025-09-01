import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { createHash } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';

@Injectable()
export class FilesService {
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue('files') private readonly filesQueue: Queue,
  ) {}

  private generateStoragePath(organizationId: string, fileId: string, originalName: string) {
    const ext = originalName.split('.').pop();
    return `${organizationId}/${fileId}.${ext}`;
  }

  async initiateUpload(
    { fileName, fileSize, organizationId }: { fileName: string; fileSize: number; organizationId: string },
    userId: string,
  ) {
    // Create file record
    const { data: file, error: fileError } = await this.supabase.client
      .from('files')
      .insert({
        organization_id: organizationId,
        original_name: fileName,
        size_bytes: fileSize,
        bucket_id: 'cad-files',
        storage_path: '',  // Will update after getting file ID
        mime_type: 'application/octet-stream',  // Will update after upload
        sha256_hash: '',  // Will update after upload
        status: 'pending',
        uploaded_by: userId,
      })
      .select()
      .single();

    if (fileError) throw fileError;

    // Update storage path now that we have the file ID
    const storagePath = this.generateStoragePath(organizationId, file.id, fileName);
    await this.supabase.client
      .from('files')
      .update({ storage_path: storagePath })
      .eq('id', file.id);

    // Generate signed upload URL
    const { data: signedUrl } = await this.supabase.client
      .storage
      .from('cad-files')
      .createSignedUploadUrl(storagePath);

    return {
      id: file.id,
      uploadUrl: signedUrl.signedUrl,
      storagePath,
    };
  }

  async completeUpload(fileId: string, userId: string) {
    // Get file info
    const { data: file } = await this.supabase.client
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (!file) throw new Error('File not found');

    // Update status to scanning
    await this.supabase.client
      .from('files')
      .update({ status: 'scanning' })
      .eq('id', fileId);

    // Download file for scanning
    const { data: fileData } = await this.supabase.client
      .storage
      .from('cad-files')
      .download(file.storage_path);

    if (!fileData) throw new Error('File download failed');

        // Calculate SHA256 hash
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const hash = createHash('sha256');
    hash.update(uint8Array);
    const sha256Hash = hash.digest('hex');

    // Detect real MIME type
    const fileType = await fileTypeFromBuffer(arrayBuffer);
    const mimeType = fileType?.mime || 'application/octet-stream';

    // Queue virus scan
    await this.filesQueue.add(
      'scan',
      {
        fileId,
        storagePath: file.storage_path,
        sha256Hash,
        mimeType,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    // Update file record
    await this.supabase.client
      .from('files')
      .update({
        sha256_hash: sha256Hash,
        mime_type: mimeType,
      })
      .eq('id', fileId);

    return { status: 'processing' };
  }

  async getFile(fileId: string, userId: string) {
    const { data: file, error } = await this.supabase.client
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) throw error;
    return file;
  }

  async getDownloadUrl(fileId: string, userId: string) {
    const { data: file } = await this.getFile(fileId, userId);

    if (file.status !== 'clean') {
      throw new Error('File is not available for download');
    }

    const { data: signedUrl } = await this.supabase.client
      .storage
      .from('cad-files')
      .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

    return { url: signedUrl };
  }
}
