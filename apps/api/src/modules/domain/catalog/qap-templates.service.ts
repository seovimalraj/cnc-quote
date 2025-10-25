import { Injectable } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { QAPTemplate } from "../../../../../packages/shared/src/types/schema";

@Injectable()
export class QapTemplatesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getQapTemplates(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('qap_templates')
      .select('*')
      .or(`org_id.is.null,org_id.eq.${orgId}`);

    if (filters.process) {
      query = query.eq('process', filters.process);
    }

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.published !== undefined) {
      query = query.eq('published', filters.published);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data } = await query.order('process').order('industry').order('name');
    return data || [];
  }

  async getQapTemplate(id: string, orgId: string) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .select('*')
      .eq('id', id)
      .or(`org_id.is.null,org_id.eq.${orgId}`)
      .single();

    return template;
  }

  async createQapTemplate(templateData: Partial<QAPTemplate>, orgId: string, userId: string) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .insert({
        ...templateData,
        org_id: orgId,
        owner_user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(template.id, 'created', userId, { templateData });

    return template;
  }

  async updateQapTemplate(id: string, updates: Partial<QAPTemplate>, userId: string) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'updated', userId, { updates });

    return template;
  }

  async publishQapTemplate(id: string, userId: string) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .update({
        published: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'published', userId);

    // Publish event for QAP generation
    await this.publishCacheInvalidation('qap_template.published', { templateId: id });

    return template;
  }

  async togglePublishQapTemplate(id: string, userId: string) {
    const { data: currentTemplate } = await this.supabase.client
      .from('qap_templates')
      .select('published')
      .eq('id', id)
      .single();

    const newPublishedState = !currentTemplate?.published;

    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .update({
        published: newPublishedState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, newPublishedState ? 'published' : 'unpublished', userId);

    if (newPublishedState) {
      await this.publishCacheInvalidation('qap_template.published', { templateId: id });
    }

    return template;
  }

  async duplicateQapTemplate(id: string, orgId: string, userId: string) {
    const { data: originalTemplate } = await this.supabase.client
      .from('qap_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalTemplate) {
      throw new Error('QAP template not found');
    }

    const { id: _, created_at, updated_at, ...templateData } = originalTemplate;
    const newTemplateData = {
      ...templateData,
      name: `${templateData.name} (Copy)`,
      published: false,
      org_id: orgId,
      owner_user_id: userId,
    };

    return this.createQapTemplate(newTemplateData, orgId, userId);
  }

  async previewQapTemplate(id: string, variables: Record<string, any> = {}) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (!template) {
      throw new Error('QAP template not found');
    }

    // Substitute variables in template content
    const processedTemplate = this.substituteVariables(template, variables);

    return processedTemplate;
  }

  private substituteVariables(template: QAPTemplate, variables: Record<string, any>) {
    // Simple variable substitution - in a real implementation, you'd use a templating engine
    let processed = JSON.stringify(template);

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    return JSON.parse(processed);
  }

  // Cache invalidation helper
  private async publishCacheInvalidation(event: string, data: any) {
    // Publish to Redis pub/sub for cache invalidation
  }

  // Audit logging
  private async logAuditEvent(templateId: string, action: string, userId: string, details?: any) {
    await this.supabase.client
      .from('catalog_audit')
      .insert({
        entity_type: 'qap_template',
        entity_id: templateId,
        action,
        user_id: userId,
        details,
        created_at: new Date().toISOString(),
      });
  }
}
