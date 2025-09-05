import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';
import { Organization, MembershipSchema, QuotaSchema } from '../../../../../packages/shared/src/types/schema';
import { z } from 'zod';

type Quota = z.infer<typeof QuotaSchema>;
type Membership = z.infer<typeof MembershipSchema>;

@Injectable()
export class AdminOrgsService {
  private readonly logger = new Logger(AdminOrgsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getOrganizations(filters: {
    query?: string;
    plan?: string;
    billing?: string;
    compliance?: string;
  }) {
    const { query: searchQuery, plan, billing, compliance } = filters;

    let query = this.supabase.client
      .from('organizations')
      .select(`
        *,
        _count:organization_memberships(count)
      `)
      .order('created_at', { ascending: false });

    // Apply search
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,domain.ilike.%${searchQuery}%`);
    }

    // Apply filters
    if (plan && plan !== 'Any') {
      query = query.eq('plan', plan.toLowerCase());
    }

    if (billing && billing !== 'Any') {
      query = query.eq('billing_status', billing.toLowerCase());
    }

    if (compliance && compliance !== 'Any') {
      if (compliance === 'ITAR') {
        query = query.eq('itar_mode', true);
      } else if (compliance === 'DFARS-only') {
        query = query.eq('dfars_only', true);
      }
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch organizations', error);
      throw new BadRequestException('Failed to fetch organizations');
    }

    return data;
  }

  async getOrganization(id: string): Promise<Organization> {
    const { data, error } = await this.supabase.client
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found');
    }

    return data;
  }

  async createOrganization(orgData: {
    name: string;
    plan?: string;
    country: string;
  }, actorId: string, actorIp: string) {
    const { data, error } = await this.supabase.client
      .from('organizations')
      .insert({
        name: orgData.name,
        plan: orgData.plan || 'free',
        country: orgData.country,
        billing_status: 'trial',
        itar_mode: false,
        dfars_only: false,
        widget_origins: [],
        default_currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create organization', error);
      throw new BadRequestException('Failed to create organization');
    }

    // Create default quota
    await this.createDefaultQuota(data.id);

    // Audit log
    await this.auditLog('create', data.id, actorId, actorIp, null, orgData);

    return data;
  }

  async updateOrganization(id: string, updates: Partial<Organization>, actorId: string, actorIp: string) {
    const org = await this.getOrganization(id);

    const { error } = await this.supabase.client
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      this.logger.error('Failed to update organization', error);
      throw new BadRequestException('Failed to update organization');
    }

    // Audit log
    await this.auditLog('update', id, actorId, actorIp, org, updates);

    return { success: true };
  }

  async changePlan(id: string, newPlan: string, actorId: string, actorIp: string) {
    const org = await this.getOrganization(id);

    const { error } = await this.supabase.client
      .from('organizations')
      .update({
        plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      this.logger.error('Failed to change plan', error);
      throw new BadRequestException('Failed to change plan');
    }

    // Audit log
    await this.auditLog('update', id, actorId, actorIp,
      { plan: org.plan }, { plan: newPlan });

    return { success: true };
  }

  async toggleITARMode(id: string, enabled: boolean, actorId: string, actorIp: string) {
    const org = await this.getOrganization(id);

    const { error } = await this.supabase.client
      .from('organizations')
      .update({
        itar_mode: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      this.logger.error('Failed to toggle ITAR mode', error);
      throw new BadRequestException('Failed to toggle ITAR mode');
    }

    // If enabling ITAR, revoke public links
    if (enabled) {
      await this.revokePublicLinks(id);
    }

    // Audit log
    await this.auditLog('update', id, actorId, actorIp,
      { itar_mode: org.itar_mode }, { itar_mode: enabled });

    return { success: true };
  }

  async getQuota(orgId: string): Promise<Quota> {
    const { data, error } = await this.supabase.client
      .from('organization_quotas')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      // Return default quota if not found
      return {
        organization_id: orgId,
        limit: {
          storage_gb: 10,
          cad_jobs_month: 100,
          quotes_month: 50,
          orders_month: 25,
          api_calls_hour: 1000,
          widget_origins_max: 5,
          users_max: 10,
        },
        usage: {
          storage_gb: 0,
          cad_jobs_month: 0,
          quotes_month: 0,
          orders_month: 0,
          api_calls_hour: 0,
          users_current: 0,
        },
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return data;
  }

  async updateQuota(orgId: string, quota: Partial<Quota['limit']>, actorId: string, actorIp: string) {
    const existingQuota = await this.getQuota(orgId);

    const { error } = await this.supabase.client
      .from('organization_quotas')
      .upsert({
        organization_id: orgId,
        limit: { ...existingQuota.limit, ...quota },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.error('Failed to update quota', error);
      throw new BadRequestException('Failed to update quota');
    }

    // Audit log
    await this.auditLog('quota_edit', orgId, actorId, actorIp,
      { limit: existingQuota.limit }, { limit: { ...existingQuota.limit, ...quota } });

    return { success: true };
  }

  async getMembers(orgId: string) {
    const { data, error } = await this.supabase.client
      .from('organization_memberships')
      .select(`
        *,
        users:user_id(name, email, status, last_active_at)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch organization members', error);
      throw new BadRequestException('Failed to fetch organization members');
    }

    return data;
  }

  async removeMember(orgId: string, userId: string, actorId: string, actorIp: string) {
    const { error } = await this.supabase.client
      .from('organization_memberships')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to remove member', error);
      throw new BadRequestException('Failed to remove member');
    }

    // Audit log
    await this.auditLog('delete', userId, actorId, actorIp, { organization_id: orgId });

    return { success: true };
  }

  async getWidgetOrigins(orgId: string) {
    const org = await this.getOrganization(orgId);
    return org.widget_origins || [];
  }

  async addWidgetOrigin(orgId: string, origin: string, actorId: string, actorIp: string) {
    const org = await this.getOrganization(orgId);
    const origins = org.widget_origins || [];

    if (origins.includes(origin)) {
      throw new BadRequestException('Origin already exists');
    }

    const updatedOrigins = [...origins, origin];

    const { error } = await this.supabase.client
      .from('organizations')
      .update({
        widget_origins: updatedOrigins,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId);

    if (error) {
      this.logger.error('Failed to add widget origin', error);
      throw new BadRequestException('Failed to add widget origin');
    }

    // Audit log
    await this.auditLog('update', orgId, actorId, actorIp,
      { widget_origins: origins }, { widget_origins: updatedOrigins });

    return { success: true };
  }

  async removeWidgetOrigin(orgId: string, origin: string, actorId: string, actorIp: string) {
    const org = await this.getOrganization(orgId);
    const origins = org.widget_origins || [];

    const updatedOrigins = origins.filter(o => o !== origin);

    const { error } = await this.supabase.client
      .from('organizations')
      .update({
        widget_origins: updatedOrigins,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId);

    if (error) {
      this.logger.error('Failed to remove widget origin', error);
      throw new BadRequestException('Failed to remove widget origin');
    }

    // Audit log
    await this.auditLog('update', orgId, actorId, actorIp,
      { widget_origins: origins }, { widget_origins: updatedOrigins });

    return { success: true };
  }

  async getAPITokens(orgId: string) {
    const { data, error } = await this.supabase.client
      .from('api_tokens')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch API tokens', error);
      throw new BadRequestException('Failed to fetch API tokens');
    }

    return data || [];
  }

  async createAPIToken(orgId: string, tokenData: {
    name: string;
    scope: string[];
  }, actorId: string, actorIp: string) {
    const token = `sk_${Math.random().toString(36).substring(2)}${Date.now()}`;

    const { data, error } = await this.supabase.client
      .from('api_tokens')
      .insert({
        organization_id: orgId,
        name: tokenData.name,
        token: token,
        scope: tokenData.scope,
        created_at: new Date().toISOString(),
        last_used_at: null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create API token', error);
      throw new BadRequestException('Failed to create API token');
    }

    // Audit log
    await this.auditLog('create', data.id, actorId, actorIp, null, tokenData);

    return { ...data, token }; // Return token only once
  }

  async revokeAPIToken(orgId: string, tokenId: string, actorId: string, actorIp: string) {
    const { error } = await this.supabase.client
      .from('api_tokens')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', tokenId);

    if (error) {
      this.logger.error('Failed to revoke API token', error);
      throw new BadRequestException('Failed to revoke API token');
    }

    // Audit log
    await this.auditLog('delete', tokenId, actorId, actorIp);

    return { success: true };
  }

  async getAuditEvents(filters: {
    org_id?: string;
  }) {
    const { org_id } = filters;

    let query = this.supabase.client
      .from('audit_events')
      .select(`
        *,
        actor:users!audit_events_actor_user_id_fkey(name, email)
      `)
      .order('ts', { ascending: false })
      .limit(100);

    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch audit events', error);
      throw new BadRequestException('Failed to fetch audit events');
    }

    return data;
  }

  private async createDefaultQuota(orgId: string) {
    const defaultQuota = {
      organization_id: orgId,
      limit: {
        storage_gb: 10,
        cad_jobs_month: 100,
        quotes_month: 50,
        orders_month: 25,
        api_calls_hour: 1000,
        widget_origins_max: 5,
        users_max: 10,
      },
      usage: {
        storage_gb: 0,
        cad_jobs_month: 0,
        quotes_month: 0,
        orders_month: 0,
        api_calls_hour: 0,
        users_current: 0,
      },
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.supabase.client
      .from('organization_quotas')
      .insert(defaultQuota);
  }

  private async revokePublicLinks(orgId: string) {
    // Revoke all public file links for the organization
    const { error } = await this.supabase.client
      .from('files')
      .update({
        signed_url: null,
        signed_url_expires_at: null,
      })
      .eq('org_id', orgId)
      .not('signed_url', 'is', null);

    if (error) {
      this.logger.error('Failed to revoke public links', error);
    }
  }

  private async auditLog(
    action: string,
    targetId: string,
    actorId: string,
    actorIp: string,
    before?: any,
    after?: any,
    targetType: string = 'organization'
  ) {
    await this.supabase.client
      .from('audit_events')
      .insert({
        actor_user_id: actorId,
        actor_ip: actorIp,
        org_id: targetType === 'organization' ? targetId : undefined,
        target_type: targetType,
        target_id: targetId,
        action,
        before,
        after,
        ts: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
  }
}
