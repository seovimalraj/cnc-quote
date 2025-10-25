import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { File, WebhookEvent } from "../../../../../packages/shared/src/types/schema";

@Injectable()
export class AdminFilesService {
  private readonly logger = new Logger(AdminFilesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getFiles(filters: {
    scope?: string;
    q?: string;
    sensitivity?: string;
    virus_scan?: string;
    date_from?: string;
    date_to?: string;
    org_id?: string;
  }) {
    const { scope, q, sensitivity, virus_scan, date_from, date_to, org_id } = filters;

    let query = this.supabase.client
      .from('files')
      .select(`
        *,
        uploaded_by_user:users!files_uploaded_by_fkey(email, first_name, last_name)
      `);

    // Apply scope filtering
    if (scope === 'Organization') {
      query = query.eq('org_id', org_id);
    } else if (scope === 'Quote') {
      query = query.eq('linked_type', 'quote');
    } else if (scope === 'Order') {
      query = query.eq('linked_type', 'order');
    } else if (scope === 'QAP') {
      query = query.eq('linked_type', 'qap');
    } else if (scope === 'Invoices') {
      query = query.eq('linked_type', 'invoice');
    }

    // Apply search
    if (q) {
      query = query.or(`name.ilike.%${q}%,mime.ilike.%${q}%,checksum_sha256.ilike.%${q}%`);
    }

    // Apply filters
    if (sensitivity && sensitivity !== 'Any') {
      query = query.eq('sensitivity', sensitivity.toLowerCase());
    }

    if (virus_scan && virus_scan !== 'Any') {
      query = query.eq('virus_scan', virus_scan.toLowerCase());
    }

    if (date_from) {
      query = query.gte('uploaded_at', date_from);
    }

    if (date_to) {
      query = query.lte('uploaded_at', date_to);
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch files', error);
      throw new BadRequestException('Failed to fetch files');
    }

    return data;
  }

  async getFile(id: string): Promise<File> {
    const { data, error } = await this.supabase.client
      .from('files')
      .select(`
        *,
        uploaded_by_user:users!files_uploaded_by_fkey(email, first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('File not found');
    }

    return data;
  }

  async generateSignedUrl(fileId: string, expiresIn: number = 3600) {
    const file = await this.getFile(fileId);

    // Check virus scan status
    if (file.virus_scan === 'infected') {
      throw new BadRequestException('Cannot generate signed URL for infected file');
    }

    // Generate signed URL using Supabase Storage
    const { data, error } = await this.supabase.client.storage
      .from(file.bucket)
      .createSignedUrl(file.path, expiresIn);

    if (error) {
      this.logger.error('Failed to generate signed URL', error);
      throw new BadRequestException('Failed to generate signed URL');
    }

    // Update file record
    await this.supabase.client
      .from('files')
      .update({
        signed_url: data.signedUrl,
        signed_url_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        download_count: file.download_count + 1,
        last_access_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    // Invalidate cache
    const keys = await this.cache.keys(`file:${fileId}:*`);
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Audit log
    await this.auditLog('signed_url_generated', fileId, { expires_in: expiresIn });

    return { signedUrl: data.signedUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  async revokeSignedUrl(fileId: string) {
    const file = await this.getFile(fileId);

    await this.supabase.client
      .from('files')
      .update({
        signed_url: null,
        signed_url_expires_at: null,
      })
      .eq('id', fileId);

    // Invalidate cache
    const keys = await this.cache.keys(`file:${fileId}:*`);
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Audit log
    await this.auditLog('signed_url_revoked', fileId);

    return { success: true };
  }

  async transferOwnership(fileId: string, transfer: {
    new_org_id: string;
    new_linked_type?: string;
    new_linked_id?: string;
  }) {
    const file = await this.getFile(fileId);

    const updateData: any = {
      org_id: transfer.new_org_id,
    };

    if (transfer.new_linked_type) {
      updateData.linked_type = transfer.new_linked_type;
      updateData.linked_id = transfer.new_linked_id || null;
    }

    const { error } = await this.supabase.client
      .from('files')
      .update(updateData)
      .eq('id', fileId);

    if (error) {
      this.logger.error('Failed to transfer ownership', error);
      throw new BadRequestException('Failed to transfer ownership');
    }

    // Invalidate cache
    const keys = await this.cache.keys(`file:${fileId}:*`);
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Audit log
    await this.auditLog('ownership_transferred', fileId, transfer);

    return { success: true };
  }

  async unlinkFile(fileId: string) {
    const { error } = await this.supabase.client
      .from('files')
      .update({
        linked_type: null,
        linked_id: null,
      })
      .eq('id', fileId);

    if (error) {
      this.logger.error('Failed to unlink file', error);
      throw new BadRequestException('Failed to unlink file');
    }

    // Invalidate cache
    const keys = await this.cache.keys(`file:${fileId}:*`);
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Audit log
    await this.auditLog('file_unlinked', fileId);

    return { success: true };
  }

  async deleteFile(fileId: string) {
    const file = await this.getFile(fileId);

    // Delete from storage
    const { error: storageError } = await this.supabase.client.storage
      .from(file.bucket)
      .remove([file.path]);

    if (storageError) {
      this.logger.error('Failed to delete file from storage', storageError);
    }

    // Soft delete from database
    const { error } = await this.supabase.client
      .from('files')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (error) {
      this.logger.error('Failed to delete file record', error);
      throw new BadRequestException('Failed to delete file');
    }

    // Invalidate cache
    const keys = await this.cache.keys(`file:${fileId}:*`);
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Audit log
    await this.auditLog('file_deleted', fileId);

    return { success: true };
  }

  async bulkRevokeLinks(fileIds: string[]) {
    const { error } = await this.supabase.client
      .from('files')
      .update({
        signed_url: null,
        signed_url_expires_at: null,
      })
      .in('id', fileIds);

    if (error) {
      this.logger.error('Failed to bulk revoke links', error);
      throw new BadRequestException('Failed to bulk revoke links');
    }

    // Invalidate cache
    for (const fileId of fileIds) {
      const keys = await this.cache.keys(`file:${fileId}:*`);
      for (const key of keys) {
        await this.cache.del(key);
      }
    }

    // Audit log
    await this.auditLog('bulk_signed_urls_revoked', null, { file_ids: fileIds });

    return { success: true, count: fileIds.length };
  }

  async bulkDeleteFiles(fileIds: string[]) {
    // Get files for storage deletion
    const { data: files } = await this.supabase.client
      .from('files')
      .select('bucket, path')
      .in('id', fileIds);

    // Delete from storage
    for (const file of files || []) {
      await this.supabase.client.storage
        .from(file.bucket)
        .remove([file.path]);
    }

    // Soft delete from database
    const { error } = await this.supabase.client
      .from('files')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .in('id', fileIds);

    if (error) {
      this.logger.error('Failed to bulk delete files', error);
      throw new BadRequestException('Failed to bulk delete files');
    }

    // Invalidate cache
    for (const fileId of fileIds) {
      const keys = await this.cache.keys(`file:${fileId}:*`);
      for (const key of keys) {
        await this.cache.del(key);
      }
    }

    // Audit log
    await this.auditLog('bulk_files_deleted', null, { file_ids: fileIds });

    return { success: true, count: fileIds.length };
  }

  async bulkTransferOwnership(fileIds: string[], transfer: {
    new_org_id: string;
    new_linked_type?: string;
    new_linked_id?: string;
  }) {
    const updateData: any = {
      org_id: transfer.new_org_id,
    };

    if (transfer.new_linked_type) {
      updateData.linked_type = transfer.new_linked_type;
      updateData.linked_id = transfer.new_linked_id || null;
    }

    const { error } = await this.supabase.client
      .from('files')
      .update(updateData)
      .in('id', fileIds);

    if (error) {
      this.logger.error('Failed to bulk transfer ownership', error);
      throw new BadRequestException('Failed to bulk transfer ownership');
    }

    // Invalidate cache
    for (const fileId of fileIds) {
      const keys = await this.cache.keys(`file:${fileId}:*`);
      for (const key of keys) {
        await this.cache.del(key);
      }
    }

    // Audit log
    await this.auditLog('bulk_ownership_transferred', null, {
      file_ids: fileIds,
      ...transfer
    });

    return { success: true, count: fileIds.length };
  }

  async setSensitivity(fileId: string, sensitivity: string, reason?: string) {
    const { error } = await this.supabase.client
      .from('files')
      .update({ sensitivity })
      .eq('id', fileId);

    if (error) {
      this.logger.error('Failed to set sensitivity', error);
      throw new BadRequestException('Failed to set sensitivity');
    }

    // Audit log
    await this.auditLog('sensitivity_changed', fileId, { sensitivity, reason });

    return { success: true };
  }

  private async auditLog(action: string, fileId: string | null, metadata?: any) {
    await this.supabase.client
      .from('audit_events')
      .insert({
        table_name: 'files',
        record_id: fileId,
        action,
        metadata,
        created_at: new Date().toISOString(),
      });
  }
}
