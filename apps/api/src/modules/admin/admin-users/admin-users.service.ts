import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { User, Membership, Invite, AuditEvent } from "@cnc-quote/shared";

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getUsers(filters: {
    query?: string;
    status?: string;
    role?: string;
    org_id?: string;
    sso?: string;
    page?: number;
    page_size?: number;
  }) {
    const { query: searchQuery, status, role, org_id, sso, page = 1, page_size = 50 } = filters;

    let query = this.supabase.client
      .from('users')
      .select(`
        *,
        memberships:organization_memberships(
          organization_id,
          role,
          organizations:organization_id(name)
        )
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * page_size, page * page_size - 1);

    // Apply search
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    // Apply filters
    if (status && status !== 'Any') {
      query = query.eq('status', status.toLowerCase());
    }

    if (sso && sso !== 'Any') {
      const ssoValue = sso === 'SSO' ? 'none' : 'none';
      query = query.neq('sso_provider', ssoValue);
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch users', error);
      throw new BadRequestException('Failed to fetch users');
    }

    // Filter by role if specified
    let filteredData = data;
    if (role && role !== 'Any') {
      filteredData = data?.filter(user =>
        user.memberships?.some((m: any) => m.role === role)
      ) || [];
    }

    // Filter by org if specified
    if (org_id) {
      filteredData = filteredData?.filter(user =>
        user.memberships?.some((m: any) => m.organization_id === org_id)
      ) || [];
    }

    return {
      data: filteredData,
      pagination: {
        page,
        page_size,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / page_size),
      },
    };
  }

  async getUser(id: string): Promise<User> {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    return data;
  }

  async getUserMemberships(userId: string) {
    const { data, error } = await this.supabase.client
      .from('organization_memberships')
      .select(`
        *,
        organizations:organization_id(name, plan, billing_status)
      `)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to fetch user memberships', error);
      throw new BadRequestException('Failed to fetch user memberships');
    }

    return data;
  }

  async createInvite(inviteData: {
    email: string;
    organization_id: string;
    role: string;
  }, actorId: string, actorIp: string) {
    // Check if user already exists
    const { data: existingUser } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', inviteData.email)
      .single();

    if (existingUser) {
      // Check if already a member
      const { data: existingMembership } = await this.supabase.client
        .from('organization_memberships')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('organization_id', inviteData.organization_id)
        .single();

      if (existingMembership) {
        throw new BadRequestException('User is already a member of this organization');
      }

      // Add to organization
      await this.addUserToOrganization(existingUser.id, inviteData.organization_id, inviteData.role, actorId, actorIp);
      return { success: true, message: 'User added to organization' };
    }

    // Create invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { data, error } = await this.supabase.client
      .from('invites')
      .insert({
        email: inviteData.email,
        organization_id: inviteData.organization_id,
        role: inviteData.role,
        status: 'pending',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create invite', error);
      throw new BadRequestException('Failed to create invite');
    }

    // Audit log
    await this.auditLog('invite_send', data.id, actorId, actorIp, null, inviteData);

    return data;
  }

  async resendInvite(inviteId: string, actorId: string, actorIp: string) {
    const { data: invite, error } = await this.supabase.client
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (error || !invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException('Invite is not in pending status');
    }

    // Update sent_at
    const { error: updateError } = await this.supabase.client
      .from('invites')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (updateError) {
      this.logger.error('Failed to resend invite', updateError);
      throw new BadRequestException('Failed to resend invite');
    }

    // Audit log
    await this.auditLog('invite_resend', inviteId, actorId, actorIp);

    return { success: true };
  }

  async revokeInvite(inviteId: string, actorId: string, actorIp: string) {
    const { data: invite, error } = await this.supabase.client
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (error || !invite) {
      throw new NotFoundException('Invite not found');
    }

    const { error: updateError } = await this.supabase.client
      .from('invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (updateError) {
      this.logger.error('Failed to revoke invite', updateError);
      throw new BadRequestException('Failed to revoke invite');
    }

    // Audit log
    await this.auditLog('invite_revoke', inviteId, actorId, actorIp, { status: invite.status }, { status: 'revoked' });

    return { success: true };
  }

  async changeRole(membershipId: string, newRole: string, actorId: string, actorIp: string) {
    const { data: membership, error } = await this.supabase.client
      .from('organization_memberships')
      .select('*')
      .eq('id', membershipId)
      .single();

    if (error || !membership) {
      throw new NotFoundException('Membership not found');
    }

    const { error: updateError } = await this.supabase.client
      .from('organization_memberships')
      .update({
        role: newRole,
        last_role_change_at: new Date().toISOString()
      })
      .eq('id', membershipId);

    if (updateError) {
      this.logger.error('Failed to change role', updateError);
      throw new BadRequestException('Failed to change role');
    }

    // Audit log
    await this.auditLog('role_change', membershipId, actorId, actorIp,
      { role: membership.role }, { role: newRole });

    return { success: true };
  }

  async disableUser(userId: string, actorId: string, actorIp: string) {
    const user = await this.getUser(userId);

    const { error } = await this.supabase.client
      .from('users')
      .update({ status: 'disabled' })
      .eq('id', userId);

    if (error) {
      this.logger.error('Failed to disable user', error);
      throw new BadRequestException('Failed to disable user');
    }

    // Audit log
    await this.auditLog('disable', userId, actorId, actorIp,
      { status: user.status }, { status: 'disabled' });

    return { success: true };
  }

  async enableUser(userId: string, actorId: string, actorIp: string) {
    const user = await this.getUser(userId);

    const { error } = await this.supabase.client
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId);

    if (error) {
      this.logger.error('Failed to enable user', error);
      throw new BadRequestException('Failed to enable user');
    }

    // Audit log
    await this.auditLog('enable', userId, actorId, actorIp,
      { status: user.status }, { status: 'active' });

    return { success: true };
  }

  async resetMFA(userId: string, actorId: string, actorIp: string) {
    const { error } = await this.supabase.client
      .from('users')
      .update({ mfa_enabled: false })
      .eq('id', userId);

    if (error) {
      this.logger.error('Failed to reset MFA', error);
      throw new BadRequestException('Failed to reset MFA');
    }

    // Audit log
    await this.auditLog('update', userId, actorId, actorIp, { mfa_enabled: true }, { mfa_enabled: false });

    return { success: true };
  }

  async forcePasswordReset(userId: string, actorId: string, actorIp: string) {
    // This would typically trigger a password reset email
    // For now, just log the action
    this.logger.log(`Forcing password reset for user ${userId}`);

    // Audit log
    await this.auditLog('update', userId, actorId, actorIp);

    return { success: true };
  }

  async revokeUserSessions(userId: string, actorId: string, actorIp: string) {
    // This would typically revoke all JWT tokens for the user
    // For now, just log the action
    this.logger.log(`Revoking sessions for user ${userId}`);

    // Audit log
    await this.auditLog('update', userId, actorId, actorIp);

    return { success: true };
  }

  async startImpersonation(userId: string, reason: string, actorId: string, actorIp: string) {
    // Create impersonation session
    const sessionId = `impersonate_${actorId}_${userId}_${Date.now()}`;

    // Audit log
    await this.auditLog('impersonate_start', userId, actorId, actorIp, null, { reason, session_id: sessionId });

    return { session_id: sessionId };
  }

  async getAuditEvents(filters: {
    target_type?: string;
    target_id?: string;
    org_id?: string;
  }) {
    const { target_type, target_id, org_id } = filters;

    let query = this.supabase.client
      .from('audit_events')
      .select(`
        *,
        actor:users!audit_events_actor_user_id_fkey(name, email)
      `)
      .order('ts', { ascending: false })
      .limit(100);

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    if (target_id) {
      query = query.eq('target_id', target_id);
    }

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

  private async addUserToOrganization(userId: string, orgId: string, role: string, actorId: string, actorIp: string) {
    const { error } = await this.supabase.client
      .from('organization_memberships')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role,
        created_at: new Date().toISOString(),
        last_role_change_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.error('Failed to add user to organization', error);
      throw new BadRequestException('Failed to add user to organization');
    }

    // Audit log
    await this.auditLog('create', userId, actorId, actorIp, null, { organization_id: orgId, role });
  }

  private async auditLog(
    action: string,
    targetId: string,
    actorId: string,
    actorIp: string,
    before?: any,
    after?: any,
    targetType: string = 'user',
    orgId?: string
  ) {
    await this.supabase.client
      .from('audit_events')
      .insert({
        actor_user_id: actorId,
        actor_ip: actorIp,
        org_id: orgId,
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
