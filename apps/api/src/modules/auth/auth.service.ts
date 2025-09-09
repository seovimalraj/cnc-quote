import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { NotifyService } from '../notify/notify.service';
import * as crypto from 'crypto';
import {
  SendInviteDto,
  AcceptInviteDto,
  ResendInviteDto,
  InviteResponseDto,
  AcceptInviteResponseDto,
  VerifyInviteResponseDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notifyService: NotifyService,
  ) {}

  async sendInvite(dto: SendInviteDto, invitedBy: any): Promise<InviteResponseDto> {
    const supabase = this.supabaseService.getClient();

    // Rate limiting: 3 invites per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentInvites, error: rateLimitError } = await supabase
      .from('user_invites')
      .select('id')
      .eq('email', dto.email)
      .gte('created_at', oneHourAgo.toISOString());

    if (rateLimitError) {
      throw new BadRequestException('Rate limit check failed');
    }

    if (recentInvites && recentInvites.length >= 3) {
      throw new BadRequestException('Too many invites sent. Please try again later.');
    }

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, status, organization_id')
      .eq('email', dto.email)
      .single();

    let userId: string | null = null;
    let organizationId: string;

    if (existingUser) {
      userId = existingUser.id;
      organizationId = existingUser.organization_id;

      // If user is already active, don't send invite
      if (existingUser.status === 'active') {
        throw new BadRequestException('User already has an active account');
      }
    } else {
      // Get or create prospects organization
      const { data: prospectsOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'prospects')
        .single();

      if (orgError) {
        throw new BadRequestException('Failed to find prospects organization');
      }

      organizationId = dto.organizationId || prospectsOrg.id;

      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: dto.email,
        password: crypto.randomBytes(32).toString('hex'), // Temporary password
        email_confirm: false,
        user_metadata: {
          status: 'invited',
          organization_id: organizationId,
        },
      });

      if (authError) {
        throw new BadRequestException('Failed to create user account');
      }

      userId = authUser.user.id;
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .insert({
        email: dto.email,
        token,
        user_id: userId,
        organization_id: organizationId,
        invited_by: invitedBy.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      throw new BadRequestException('Failed to create invite');
    }

    // Send invite email
    await this.sendInviteEmail(dto.email, token, dto.message);

    // Create session token for immediate access
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
      });

    if (sessionError) {
      this.logger.error('Failed to create session:', sessionError);
    }

    return {
      inviteId: invite.id,
      email: dto.email,
      expiresAt,
      sessionToken,
      message: 'Invitation sent successfully',
    };
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<AcceptInviteResponseDto> {
    const supabase = this.supabaseService.getClient();

    // Verify token
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('*, user:user_id(*)')
      .eq('token', dto.token)
      .gt('expires_at', new Date().toISOString())
      .is('accepted_at', null)
      .single();

    if (inviteError || !invite) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Update user password in Supabase Auth
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      invite.user_id,
      {
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          status: 'active',
          password_set_at: new Date().toISOString(),
        },
      }
    );

    if (passwordError) {
      throw new BadRequestException('Failed to set password');
    }

    // Update user status
    const { error: userError } = await supabase
      .from('users')
      .update({
        status: 'active',
        password_set_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invite.user_id);

    if (userError) {
      throw new BadRequestException('Failed to update user status');
    }

    // Mark invite as accepted
    const { error: acceptError } = await supabase
      .from('user_invites')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (acceptError) {
      this.logger.error('Failed to mark invite as accepted:', acceptError);
    }

    // Create session token for immediate access
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: invite.user_id,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
      });

    if (sessionError) {
      this.logger.error('Failed to create session:', sessionError);
    }

    // Merge any existing leads/DFM requests
    await this.mergeExistingData(invite.user_id, invite.email);

    return {
      userId: invite.user_id,
      email: invite.email,
      organizationId: invite.organization_id,
      sessionToken,
      message: 'Account activated successfully',
    };
  }

  async resendInvite(dto: ResendInviteDto, user: any): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Find the most recent pending invite
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('*')
      .eq('email', dto.email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (inviteError || !invite) {
      throw new NotFoundException('No pending invitation found for this email');
    }

    // Send invite email again
    await this.sendInviteEmail(dto.email, invite.token);
  }

  async verifyInviteToken(token: string): Promise<VerifyInviteResponseDto> {
    const supabase = this.supabaseService.getClient();

    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('*, organization:organization_id(name)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('accepted_at', null)
      .single();

    if (inviteError || !invite) {
      throw new BadRequestException('Invalid or expired token');
    }

    return {
      email: invite.email,
      organizationName: invite.organization?.name || 'Unknown',
      valid: true,
    };
  }

  private async sendInviteEmail(email: string, token: string, customMessage?: string): Promise<void> {
    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;

    const subject = 'Welcome to CNC Quote - Set Up Your Account';
    const text = `
Hello,

You've been invited to join CNC Quote! Click the link below to set up your password and get started:

${inviteUrl}

This link will expire in 7 days.

${customMessage ? `\n${customMessage}\n` : ''}

If you didn't expect this invitation, please ignore this email.

Best regards,
The CNC Quote Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to CNC Quote</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Welcome to CNC Quote!</h1>

        <p>You've been invited to join our platform. Click the button below to set up your password and get started:</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Set Up Your Account
            </a>
        </div>

        <p><strong>This link will expire in 7 days.</strong></p>

        ${customMessage ? `<p><em>${customMessage}</em></p>` : ''}

        <p>If you didn't expect this invitation, please ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The CNC Quote Team
        </p>
    </div>
</body>
</html>
    `;

    try {
      await this.notifyService.sendEmail({
        to: email,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error('Failed to send invite email:', error);
      throw new BadRequestException('Failed to send invitation email');
    }
  }

  private async mergeExistingData(userId: string, email: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    try {
      // Update any existing leads with this email to link to the user
      await supabase
        .from('leads')
        .update({ user_id: userId })
        .eq('email', email)
        .is('user_id', null);

      // Update any existing DFM requests with this email to link to the user
      await supabase
        .from('dfm_requests')
        .update({ user_id: userId })
        .eq('user_id', null)
        .eq('created_by_email', email); // Assuming there's a created_by_email field

    } catch (error) {
      this.logger.error('Failed to merge existing data:', error);
      // Don't throw - this is not critical for account creation
    }
  }
}
