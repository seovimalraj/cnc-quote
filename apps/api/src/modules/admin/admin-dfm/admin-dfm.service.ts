import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import {
  DfmOptionDto,
  CreateDfmOptionDto,
  UpdateDfmOptionDto,
  PublishDfmOptionsDto,
  DfmRuleDto,
  CreateDfmRuleDto,
  UpdateDfmRuleDto,
  DfmRequestSummaryDto,
  DfmRequestDetailDto,
  DfmInboxFiltersDto,
} from './admin-dfm.dto';

@Injectable()
export class AdminDfmService {
  private readonly logger = new Logger(AdminDfmService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ===== DFM OPTIONS MANAGEMENT =====

  async getOptions(optionType: string, orgId: string): Promise<DfmOptionDto[]> {
    const tableName = this.getTableName(optionType);

    const { data, error } = await this.supabaseService.client
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching ${optionType} options:`, error);
      throw new BadRequestException(`Failed to fetch ${optionType} options`);
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      published: item.published,
      publishedAt: item.published_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async createOption(
    optionType: string,
    dto: CreateDfmOptionDto,
    user: any,
  ): Promise<DfmOptionDto> {
    const tableName = this.getTableName(optionType);

    const { data, error } = await this.supabaseService.client
      .from(tableName)
      .insert({
        name: dto.name,
        description: dto.description,
        published: dto.published || false,
        published_at: dto.published ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating ${optionType} option:`, error);
      throw new BadRequestException(`Failed to create ${optionType} option`);
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'option_created', optionType, data.id, {
      name: dto.name,
      published: dto.published,
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      published: data.published,
      publishedAt: data.published_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateOption(
    optionType: string,
    id: string,
    dto: UpdateDfmOptionDto,
    user: any,
  ): Promise<DfmOptionDto> {
    const tableName = this.getTableName(optionType);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.published !== undefined) {
      updateData.published = dto.published;
      updateData.published_at = dto.published ? new Date().toISOString() : null;
    }

    const { data, error } = await this.supabaseService.client
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating ${optionType} option:`, error);
      throw new BadRequestException(`Failed to update ${optionType} option`);
    }

    if (!data) {
      throw new NotFoundException(`${optionType} option not found`);
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'option_updated', optionType, id, dto);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      published: data.published,
      publishedAt: data.published_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async deleteOption(optionType: string, id: string, user: any): Promise<void> {
    const tableName = this.getTableName(optionType);

    const { error } = await this.supabaseService.client
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting ${optionType} option:`, error);
      throw new BadRequestException(`Failed to delete ${optionType} option`);
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'option_deleted', optionType, id, {});
  }

  async publishOptions(dto: PublishDfmOptionsDto, user: any): Promise<{ message: string; publishedCount: number }> {
    const tableName = this.getTableName(dto.optionType);

    const { data, error } = await this.supabaseService.client
      .from(tableName)
      .update({
        published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', dto.optionIds)
      .select();

    if (error) {
      this.logger.error(`Error publishing ${dto.optionType} options:`, error);
      throw new BadRequestException(`Failed to publish ${dto.optionType} options`);
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'options_published', dto.optionType, null, {
      optionIds: dto.optionIds,
      publishedCount: data.length,
    });

    return {
      message: `${data.length} ${dto.optionType} options published successfully`,
      publishedCount: data.length,
    };
  }

  // ===== DFM RULES MANAGEMENT =====

  async getDfmRules(orgId: string, processType?: string): Promise<DfmRuleDto[]> {
    let query = this.supabaseService.client
      .from('dfm_rules')
      .select('*')
      .or(`org_id.is.null,org_id.eq.${orgId}`)
      .order('created_at', { ascending: false });

    if (processType) {
      query = query.eq('process_type', processType);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error fetching DFM rules:', error);
      throw new BadRequestException('Failed to fetch DFM rules');
    }

    return data.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      processType: rule.process_type,
      severity: rule.severity,
      condition: rule.condition,
      message: rule.message,
      triggersManualReview: rule.triggers_manual_review,
      version: rule.version,
      publishedAt: rule.published_at,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
    }));
  }

  async createDfmRule(dto: CreateDfmRuleDto, user: any): Promise<DfmRuleDto> {
    const { data, error } = await this.supabaseService.client
      .from('dfm_rules')
      .insert({
        name: dto.name,
        description: dto.description,
        process_type: dto.processType,
        severity: dto.severity,
        condition: dto.condition,
        message: dto.message,
        triggers_manual_review: dto.triggersManualReview || false,
        org_id: user.org_id,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating DFM rule:', error);
      throw new BadRequestException('Failed to create DFM rule');
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'rule_created', 'dfm_rules', data.id, {
      name: dto.name,
      processType: dto.processType,
      severity: dto.severity,
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      processType: data.process_type,
      severity: data.severity,
      condition: data.condition,
      message: data.message,
      triggersManualReview: data.triggers_manual_review,
      version: data.version,
      publishedAt: data.published_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateDfmRule(id: string, dto: UpdateDfmRuleDto, user: any): Promise<DfmRuleDto> {
    // Get current rule to increment version
    const { data: currentRule, error: fetchError } = await this.supabaseService.client
      .from('dfm_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentRule) {
      throw new NotFoundException('DFM rule not found');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      version: currentRule.version + 1,
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.severity !== undefined) updateData.severity = dto.severity;
    if (dto.condition !== undefined) updateData.condition = dto.condition;
    if (dto.message !== undefined) updateData.message = dto.message;
    if (dto.triggersManualReview !== undefined) updateData.triggers_manual_review = dto.triggersManualReview;

    const { data, error } = await this.supabaseService.client
      .from('dfm_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Error updating DFM rule:', error);
      throw new BadRequestException('Failed to update DFM rule');
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'rule_updated', 'dfm_rules', id, dto);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      processType: data.process_type,
      severity: data.severity,
      condition: data.condition,
      message: data.message,
      triggersManualReview: data.triggers_manual_review,
      version: data.version,
      publishedAt: data.published_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async deleteDfmRule(id: string, user: any): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('dfm_rules')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Error deleting DFM rule:', error);
      throw new BadRequestException('Failed to delete DFM rule');
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'rule_deleted', 'dfm_rules', id, {});
  }

  async publishRules(user: any): Promise<{ message: string; publishedCount: number }> {
    const { data, error } = await this.supabaseService.client
      .from('dfm_rules')
      .update({
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', user.org_id)
      .is('published_at', null)
      .select();

    if (error) {
      this.logger.error('Error publishing DFM rules:', error);
      throw new BadRequestException('Failed to publish DFM rules');
    }

    // Log audit event
    await this.logAuditEvent(user.id, user.org_id, 'rules_published', 'dfm_rules', null, {
      publishedCount: data.length,
    });

    return {
      message: `${data.length} DFM rules published successfully`,
      publishedCount: data.length,
    };
  }

  async getRulesVersion(orgId: string): Promise<{ version: number; publishedAt: Date }> {
    const { data, error } = await this.supabaseService.client
      .from('dfm_rules')
      .select('version, published_at')
      .eq('org_id', orgId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { version: 0, publishedAt: new Date() };
    }

    return {
      version: data.version,
      publishedAt: new Date(data.published_at),
    };
  }

  // ===== DFM INBOX MANAGEMENT =====

  async getDfmRequests(
    orgId: string,
    filters: DfmInboxFiltersDto,
  ): Promise<{ requests: DfmRequestSummaryDto[]; total: number }> {
    let query = this.supabaseService.client
      .from('dfm_requests')
      .select(`
        *,
        user:user_id(id, email, raw_user_meta_data),
        organization:organization_id(id, name),
        results:dfm_results(summary)
      `, { count: 'exact' })
      .eq('organization_id', orgId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.hasBlockers !== undefined) {
      if (filters.hasBlockers) {
        query = query.not('results.summary->blockers', 'eq', 0);
      } else {
        query = query.or('results.summary->blockers.is.null,results.summary->blockers.eq.0');
      }
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Error fetching DFM requests:', error);
      throw new BadRequestException('Failed to fetch DFM requests');
    }

    const requests: DfmRequestSummaryDto[] = data.map(request => ({
      id: request.id,
      fileName: request.file_name,
      status: request.status,
      tolerancePack: request.tolerance_pack,
      surfaceFinish: request.surface_finish,
      industry: request.industry,
      criticality: request.criticality,
      userName: request.user?.raw_user_meta_data?.full_name || request.user?.email,
      organizationName: request.organization?.name,
      checkSummary: request.results?.[0]?.summary,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    }));

    return { requests, total: count || 0 };
  }

  async getDfmRequestDetail(id: string, orgId: string): Promise<DfmRequestDetailDto> {
    const { data, error } = await this.supabaseService.client
      .from('dfm_requests')
      .select(`
        *,
        user:user_id(id, email, raw_user_meta_data),
        organization:organization_id(id, name),
        results:dfm_results(*)
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      throw new NotFoundException('DFM request not found');
    }

    return {
      id: data.id,
      fileName: data.file_name,
      status: data.status,
      tolerancePack: data.tolerance_pack,
      surfaceFinish: data.surface_finish,
      industry: data.industry,
      criticality: data.criticality,
      certifications: data.certifications || [],
      notes: data.notes,
      user: data.user ? {
        id: data.user.id,
        name: data.user.raw_user_meta_data?.full_name || 'Unknown',
        email: data.user.email,
      } : undefined,
      organization: data.organization ? {
        id: data.organization.id,
        name: data.organization.name,
      } : undefined,
      results: data.results?.[0] ? {
        summary: data.results[0].summary,
        checks: data.results[0].checks,
        viewerMeshId: data.results[0].viewer_mesh_id,
        reportPdfId: data.results[0].report_pdf_id,
        qapPdfId: data.results[0].qap_pdf_id,
      } : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async convertToManualReview(id: string, user: any): Promise<{ message: string }> {
    // This would integrate with the manual review system
    // For now, just log the action
    await this.logAuditEvent(user.id, user.org_id, 'dfm_converted_to_manual', 'dfm_requests', id, {});

    return { message: 'DFM request converted to manual review' };
  }

  async createQuoteFromDfm(id: string, user: any): Promise<{ quoteId: string; message: string }> {
    // This would integrate with the quotes system
    // For now, just log the action and return a placeholder
    await this.logAuditEvent(user.id, user.org_id, 'quote_created_from_dfm', 'dfm_requests', id, {});

    return {
      quoteId: 'placeholder-quote-id',
      message: 'Quote created from DFM analysis',
    };
  }

  async exportDfmRequests(orgId: string, filters: Partial<DfmInboxFiltersDto>): Promise<string> {
    const { requests } = await this.getDfmRequests(orgId, filters as DfmInboxFiltersDto);

    // Create CSV content
    const headers = [
      'ID',
      'File Name',
      'Status',
      'Tolerance Pack',
      'Surface Finish',
      'Industry',
      'Criticality',
      'User',
      'Organization',
      'Passed Checks',
      'Warnings',
      'Blockers',
      'Created At',
    ];

    const rows = requests.map(request => [
      request.id,
      request.fileName,
      request.status,
      request.tolerancePack,
      request.surfaceFinish,
      request.industry,
      request.criticality,
      request.userName || '',
      request.organizationName || '',
      request.checkSummary?.passed || 0,
      request.checkSummary?.warnings || 0,
      request.checkSummary?.blockers || 0,
      request.createdAt.toISOString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // ===== PRIVATE HELPERS =====

  private getTableName(optionType: string): string {
    const tableMap = {
      tolerances: 'dfm_tolerance_options',
      finishes: 'dfm_finish_options',
      industries: 'dfm_industry_options',
      certifications: 'dfm_certification_options',
      criticality: 'dfm_criticality_options',
    };

    const tableName = tableMap[optionType];
    if (!tableName) {
      throw new BadRequestException(`Invalid option type: ${optionType}`);
    }

    return tableName;
  }

  private async logAuditEvent(
    adminUserId: string,
    orgId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    details: any,
  ): Promise<void> {
    try {
      await this.supabaseService.client
        .from('dfm_admin_audit_log')
        .insert({
          admin_user_id: adminUserId,
          organization_id: orgId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
        });
    } catch (error) {
      this.logger.error('Error logging audit event:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }
}
