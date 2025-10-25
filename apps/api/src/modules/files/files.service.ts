import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { FileMeta } from "../../../../../packages/shared/src/types/schema";

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  constructor(private readonly supabase: SupabaseService) {}

  async getFiles(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('file_meta')
      .select(`
        *,
        owner:users (name, email),
        linked_quotes:quotes (id, status),
        linked_orders:orders (id, order_number, status)
      `)
      .eq('org_id', orgId)
      .is('deleted_at', null);

    if (filters.kind) {
      query = query.eq('kind', filters.kind);
    }

    if (filters.itar !== undefined) {
      query = query.eq('itar_cui', filters.itar);
    }

    if (filters.preview_ready !== undefined) {
      query = query.eq('preview_ready', filters.preview_ready);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  async getFile(fileId: string, orgId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select(`
        *,
        owner:users (name, email),
        linked_quotes:quotes (id, status),
        linked_orders:orders (id, order_number, status),
        audit_events:file_audit (
          id,
          action,
          user_id,
          created_at,
          details,
          user:users (name, email)
        )
      `)
      .eq('id', fileId)
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .single();

    return file;
  }

  async createFile(fileData: Partial<FileMeta>, userId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .insert({
        ...fileData,
        owner_user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(file.id, 'created', userId, { fileData });

    return file;
  }

  async updateFile(fileId: string, updates: Partial<FileMeta>, userId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(fileId, 'updated', userId, { updates });

    return file;
  }

  async linkFileToObject(fileId: string, type: string, objectId: string, tags: string[] = [], userId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select('linked_to, tags')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    const updatedLinks = [
      ...file.linked_to,
      { type, id: objectId }
    ];

    const updatedTags = [...new Set([...(file.tags || []), ...tags])];

    const { data: updatedFile } = await this.supabase.client
      .from('file_meta')
      .update({
        linked_to: updatedLinks,
        tags: updatedTags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(fileId, 'linked', userId, { type, objectId, tags });

    return updatedFile;
  }

  async unlinkFileFromObject(fileId: string, type: string, objectId: string, userId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select('linked_to')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    const updatedLinks = file.linked_to.filter(
      link => !(link.type === type && link.id === objectId)
    );

    const { data: updatedFile } = await this.supabase.client
      .from('file_meta')
      .update({
        linked_to: updatedLinks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(fileId, 'unlinked', userId, { type, objectId });

    return updatedFile;
  }

  async deleteFile(fileId: string, userId: string) {
    // Soft delete
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(fileId, 'deleted', userId);

    return file;
  }

  async getSignedUrl(fileId: string, disposition: 'inline' | 'attachment' = 'inline') {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select('bucket, path, name, mime')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    // Generate signed URL (implementation depends on storage provider)
    // For Supabase Storage:
    const { data: signedUrl } = await this.supabase.client.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 300, {
        download: disposition === 'attachment' ? file.name : undefined,
      });

    return signedUrl?.signedUrl;
  }

  // Bulk operations
  async bulkDownload(fileIds: string[], userId: string) {
    // Get file metadata
    const { data: files } = await this.supabase.client
      .from('file_meta')
      .select('id, bucket, path, name, size_bytes')
      .in('id', fileIds);

    if (!files || files.length === 0) {
      throw new Error('Files not found');
    }

    // Generate signed URLs for each file
    const fileUrls = await Promise.all(
      files.map(async (file) => {
        const signedUrl = await this.getSignedUrl(file.id, 'attachment');
        return {
          id: file.id,
          name: file.name,
          url: signedUrl,
          size: file.size_bytes
        };
      })
    );

    // Log bulk download audit event
    await this.logAuditEvent(null, 'bulk_download', userId, { file_ids: fileIds });

    return {
      files: fileUrls,
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.size_bytes || 0), 0),
    };
  }

  async bulkDelete(fileIds: string[], userId: string) {
    const { data } = await this.supabase.client
      .from('file_meta')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .in('id', fileIds)
      .select();

    // Log audit events
    for (const fileId of fileIds) {
      await this.logAuditEvent(fileId, 'bulk_deleted', userId);
    }

    return data;
  }

  async bulkTag(fileIds: string[], tags: string[], userId: string) {
    // Get current tags for each file and merge
    const { data: filesData } = await this.supabase.client
      .from('file_meta')
      .select('id, tags')
      .in('id', fileIds);

    const updates = filesData?.map(file => ({
      id: file.id,
      tags: [...new Set([...(file.tags || []), ...tags])],
    })) || [];

    for (const update of updates) {
      await this.supabase.client
        .from('file_meta')
        .update({
          tags: update.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id);

      // Log audit event
      await this.logAuditEvent(update.id, 'bulk_tagged', userId, { tags });
    }

    return updates;
  }

  // Preview generation (would be called by background job)
  async generatePreview(fileId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select('bucket, path, mime, kind')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    // Generate preview based on file type
    // Implementation depends on file type and storage solution
    let previewGenerated = false;

    if (file.mime.startsWith('application/pdf')) {
      // Generate PDF preview
      previewGenerated = true;
    } else if (file.mime.startsWith('image/')) {
      // Generate image thumbnail
      previewGenerated = true;
    } else if (file.kind === 'cad' || file.mime.includes('step') || file.mime.includes('iges')) {
      // Generate CAD preview (would use external service)
      previewGenerated = true;
    }

    if (previewGenerated) {
      await this.supabase.client
        .from('file_meta')
        .update({
          preview_ready: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);
    }

    return { previewGenerated };
  }

  // Audit logging
  private async logAuditEvent(fileId: string, action: string, userId: string, details?: any) {
    await this.supabase.client
      .from('file_audit')
      .insert({
        file_id: fileId,
        action,
        user_id: userId,
        details,
        created_at: new Date().toISOString(),
      });
  }

  // Virus scanning (would be called by background job)
  async scanForVirus(fileId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select('bucket, path, mime, name')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    // Basic file validation - check if file content matches expected MIME type
    // This is a simplified security check, not full virus scanning
    let isClean = true;
    let scanResult = 'clean';

    try {
      // Download file content to validate
      const { data: fileData, error } = await this.supabase.client.storage
        .from(file.bucket)
        .download(file.path);

      if (error) {
        throw new Error(`Failed to download file for scanning: ${error.message}`);
      }

      // Convert blob to buffer for validation
      const buffer = Buffer.from(await fileData.arrayBuffer());

      // Basic file signature validation
      if (buffer.length < 4) {
        isClean = false;
        scanResult = 'file_too_small';
      } else {
        // Check file signatures for common CAD and document formats
        const signature = buffer.subarray(0, 4).toString('hex');

        // PDF files should start with %PDF
        if (file.mime === 'application/pdf' && !buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
          isClean = false;
          scanResult = 'invalid_pdf_signature';
        }
        // ZIP files should start with PK
        else if (file.mime === 'application/zip' && signature !== '504b0304') {
          isClean = false;
          scanResult = 'invalid_zip_signature';
        }
        // STL files (binary) should start with solid or have specific binary signature
        else if (file.mime === 'model/stl' && !this.isValidSTL(buffer)) {
          isClean = false;
          scanResult = 'invalid_stl_format';
        }
        // STEP files should contain ISO-10303
        else if (file.name.toLowerCase().endsWith('.step') || file.name.toLowerCase().endsWith('.stp')) {
          const content = buffer.toString('utf8', 0, 1000);
          if (!content.includes('ISO-10303')) {
            isClean = false;
            scanResult = 'invalid_step_format';
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error during file validation for ${fileId}:`, error);
      isClean = false;
      scanResult = 'scan_error';
    }

    await this.supabase.client
      .from('file_meta')
      .update({
        virus_scanned: true,
        virus_scan_result: scanResult,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    return { isClean, result: scanResult };
  }

  private isValidSTL(buffer: Buffer): boolean {
    // Check for ASCII STL (starts with "solid")
    const asciiCheck = buffer.subarray(0, 5).toString('ascii').toLowerCase() === 'solid';

    // Check for binary STL (first 80 bytes are comment, then uint32 triangle count)
    const binaryCheck = buffer.length >= 84; // Minimum binary STL size

    return asciiCheck || binaryCheck;
  }
}
