import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../lib/supabase/supabase.service';

@Injectable()
export class RbacOrgGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Load org membership
    const { data: membership, error } = await this.supabase.client
      .from('org_members')
      .select('*, orgs(*)')
      .eq('user_id', user.id)
      .single();

    if (error || !membership) {
      throw new BadRequestException('User not associated with any organization');
    }

    // Attach org context to request
    (request as any).org = membership.orgs;
    (request as any).membership = membership;

    return true;
  }
}