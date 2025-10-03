import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CreateOrgDto } from './dto/create-org.dto';

export interface OrgRecord {
  id: string;
  name: string;
  slug: string;
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

@Injectable()
export class OrgsService {
  private readonly logger = new Logger(OrgsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async listUserOrgs(userId: string): Promise<OrgRecord[]> {
    const { data, error } = await this.supabase.client
      .from('org_members')
      .select('org:orgs(id,name,slug)')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || [])
      .map((row: any) => row.org)
      .filter(Boolean);
  }

  async createOrg(userId: string, dto: CreateOrgDto): Promise<OrgRecord> {
    const slug = dto.slug ? slugify(dto.slug) : this.generateSlug(dto.name);

    const { data: org, error } = await this.supabase.client
      .from('orgs')
      .insert({
        name: dto.name,
        slug,
        created_by: userId,
      })
      .select('id,name,slug')
      .single();

    if (error) throw error;

    const { error: memberError } = await this.supabase.client
      .from('org_members')
      .insert({ org_id: org.id, user_id: userId, role: 'admin' });

    if (memberError) throw memberError;

    await this.supabase.client
      .from('users')
      .update({
        default_org_id: org.id,
        last_org_id: org.id,
      })
      .eq('id', userId);

    return org;
  }

  async switchOrg(userId: string, orgId: string): Promise<void> {
    const membership = await this.supabase.client
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membership.error) throw membership.error;
    if (!membership.data) {
      throw new Error('User not a member of organisation');
    }

    const { error } = await this.supabase.client
      .from('users')
      .update({ last_org_id: orgId })
      .eq('id', userId);

    if (error) throw error;

  }

  async listMembers(orgId: string): Promise<Array<{ user_id: string; email?: string; role: string; joined_at?: string }>> {
    const { data, error } = await this.supabase.client
      .from('org_members')
      .select('user_id, role, joined_at, user:users(email)')
      .eq('org_id', orgId);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      user_id: row.user_id,
      email: row.user?.email,
      role: row.role,
      joined_at: row.joined_at,
    }));
  }

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    role: string,
  ): Promise<{ previousRole: string | null; role: string }> {
    const { data: before, error: beforeError } = await this.supabase.client
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (beforeError) throw beforeError;
    if (!before) {
      throw new Error('Organization member not found');
    }

    const { error } = await this.supabase.client
      .from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', targetUserId);

    if (error) throw error;

    return { previousRole: before.role ?? null, role };
  }

  private generateSlug(name: string): string {
    const base = slugify(name);
    if (!base) {
      return `org-${Math.random().toString(36).slice(2, 8)}`;
    }
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
}
