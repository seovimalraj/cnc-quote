import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { InspectionTemplate } from '../../../../../packages/shared/src/types/schema';

@Injectable()
export class InspectionTemplatesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getInspectionTemplates(filters: any = {}) {
    let query = this.supabase.client
      .from('inspection_templates')
      .select('*')
      .eq('archived', false);

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.max_dims) {
      query = query.lte('max_dimensions', filters.max_dims);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data } = await query.order('type').order('name');
    return data || [];
  }

  async getInspectionTemplate(id: string) {
    const { data: template } = await this.supabase.client
      .from('inspection_templates')
      .select('*')
      .eq('id', id)
      .single();

    return template;
  }

  async createInspectionTemplate(templateData: Partial<InspectionTemplate>, userId: string) {
    const { data: template } = await this.supabase.client
      .from('inspection_templates')
      .insert({
        ...templateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(template.id, 'created', userId, { templateData });

    return template;
  }

  async updateInspectionTemplate(id: string, updates: Partial<InspectionTemplate>, userId: string) {
    const { data: template } = await this.supabase.client
      .from('inspection_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'updated', userId, { updates });

    // Publish cache invalidation event
    await this.publishCacheInvalidation('inspection.updated', { templateId: id });

    return template;
  }

  async archiveInspectionTemplate(id: string, userId: string) {
    const { data: template } = await this.supabase.client
      .from('inspection_templates')
      .update({
        archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'archived', userId);

    return template;
  }

  async duplicateInspectionTemplate(id: string, userId: string) {
    const { data: originalTemplate } = await this.supabase.client
      .from('inspection_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalTemplate) {
      throw new Error('Inspection template not found');
    }

    const { id: _, created_at, updated_at, ...templateData } = originalTemplate;
    const newTemplateData = {
      ...templateData,
      name: `${templateData.name} (Copy)`,
    };

    return this.createInspectionTemplate(newTemplateData, userId);
  }

  // Cache invalidation helper
  private async publishCacheInvalidation(event: string, data: any) {
    // Publish to Redis pub/sub for cache invalidation
    console.log(`Publishing cache invalidation: ${event}`, data);
  }

  // Audit logging
  private async logAuditEvent(templateId: string, action: string, userId: string, details?: any) {
    await this.supabase.client
      .from('catalog_audit')
      .insert({
        entity_type: 'inspection_template',
        entity_id: templateId,
        action,
        user_id: userId,
        details,
        created_at: new Date().toISOString(),
      });
  }
}
