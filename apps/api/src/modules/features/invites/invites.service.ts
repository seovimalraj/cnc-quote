import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { InviteDto } from "../orgs/dto/invite.dto";
import { createHmac, timingSafeEqual } from 'crypto';
import { ContractsVNext } from '@cnc-quote/shared';

interface InviteTokenPayload {
  orgId: string;
  email: string;
  role: string;
  invitedBy: string;
  exp: number;
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);
  private readonly signingKey: string;
  private readonly defaultExpiryHours: number;

  constructor(
    private readonly supabase: SupabaseService,
    configService: ConfigService,
  ) {
    this.signingKey = configService.get<string>('ORG_INVITE_SIGNING_KEY', 'change-me');
    this.defaultExpiryHours = Number(configService.get('ORG_INVITE_EXPIRY_HOURS') ?? 72);
  }

  async createInvite(orgId: string, actorId: string, dto: InviteDto): Promise<{ token: string; expires_at: string }> {
    const expiresAt = new Date(Date.now() + this.defaultExpiryHours * 60 * 60 * 1000);
    const payload: InviteTokenPayload = {
      orgId,
      email: dto.email,
      role: dto.role,
      invitedBy: actorId,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const token = this.signPayload(payload);

    const { error } = await this.supabase.client.from('org_invites').insert({
      org_id: orgId,
      email: dto.email,
      role: dto.role,
      token,
      invited_by: actorId,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw error;

    return { token, expires_at: expiresAt.toISOString() };
  }

  async acceptInvite(token: string, userId: string, email: string): Promise<{ orgId: string; role: string }> {
    const { payload } = this.verifyToken(token);

    const { data: invite, error } = await this.supabase.client
      .from('org_invites')
      .select('org_id, role, email, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!invite) throw new BadRequestException('Invite not found or revoked');
    if (invite.accepted_at) throw new BadRequestException('Invite already used');

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      throw new BadRequestException('Invite expired');
    }

    if (invite.email.toLowerCase() !== payload.email.toLowerCase()) {
      throw new BadRequestException('Invite email mismatch');
    }

    const membership = await this.supabase.client
      .from('org_members')
      .insert({ org_id: invite.org_id, user_id: userId, role: invite.role })
      .select('org_id')
      .maybeSingle();

    if (membership.error && membership.error.code !== '23505') {
      throw membership.error;
    }

    await this.supabase.client
      .from('org_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token);

    const { error: updateUserError } = await this.supabase.client
      .from('users')
      .update({
        default_org_id: invite.org_id,
        last_org_id: invite.org_id,
      })
      .eq('id', userId)
      .is('default_org_id', null);

    if (updateUserError && updateUserError.code !== 'PGRST116') {
      this.logger.warn(`Failed to set default_org_id for user ${userId}: ${updateUserError.message}`);
    }

    return { orgId: invite.org_id, role: invite.role };
  }

  async getInviteDetails(token: string): Promise<ContractsVNext.OrgInviteDetails> {
    const { data, error } = await this.supabase.client
      .from('org_invites')
      .select(
        `token, email, role, invited_at, expires_at, accepted_at, org_id,
         org:org_id(id, name),
         inviter:invited_by(id, email, name)`
      )
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new NotFoundException('Invite not found or revoked');
    }

    const expiresAt = new Date(data.expires_at);
    const acceptedAt = data.accepted_at ? new Date(data.accepted_at) : null;
    const now = new Date();

    let status: ContractsVNext.OrgInviteStatus = 'pending';
    if (acceptedAt) {
      status = 'accepted';
    } else if (expiresAt.getTime() <= now.getTime()) {
      status = 'expired';
    }

    const organizationId = data.org?.id ?? data.org_id;
    if (!organizationId) {
      throw new BadRequestException('Invite missing organization context');
    }
    const orgName = data.org?.name?.trim() || 'Unnamed Organisation';

    const inviter = data.inviter
      ? {
          id: data.inviter.id,
          name: (data.inviter.name || data.inviter.email).trim() || data.inviter.email,
          email: data.inviter.email,
        }
      : null;

    return {
      token: data.token,
      email: data.email,
      role: data.role as ContractsVNext.OrgInviteRole,
      organization: {
        id: organizationId,
        name: orgName,
      },
      invitedAt: new Date(data.invited_at).toISOString(),
      expiresAt: expiresAt.toISOString(),
      acceptedAt: acceptedAt ? acceptedAt.toISOString() : null,
      inviter,
      status,
      canAccept: status === 'pending',
    };
  }

  private signPayload(payload: InviteTokenPayload): string {
    const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.signingKey).update(base).digest('base64url');
    return `${base}.${signature}`;
  }

  private verifyToken(token: string): { payload: InviteTokenPayload } {
    const [base, signature] = token.split('.');
    if (!base || !signature) {
      throw new BadRequestException('Malformed invite token');
    }
    const expected = createHmac('sha256', this.signingKey).update(base).digest('base64url');
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new BadRequestException('Invalid invite token');
    }

    const payload = JSON.parse(Buffer.from(base, 'base64url').toString()) as InviteTokenPayload;
    if (payload.exp * 1000 < Date.now()) {
      throw new BadRequestException('Invite token expired');
    }

    return { payload };
  }
}
