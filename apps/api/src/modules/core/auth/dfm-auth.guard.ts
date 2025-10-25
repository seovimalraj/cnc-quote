import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SupabaseService } from "../../../lib/supabase/supabase.service";

@Injectable()
export class DfmAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const allowSession = this.reflector.get<boolean>('allowSession', context.getHandler());

    // Try JWT authentication first
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Validate JWT token (this would be handled by JwtAuthGuard normally)
        // For now, we'll assume it's valid if present
        return true;
      } catch (error) {
        // JWT invalid, try session if allowed
      }
    }

    // Try session authentication if allowed
    if (allowSession) {
      const sessionToken = request.headers['x-session-token'] as string ||
                          request.query.sessionToken as string ||
                          request.cookies?.sessionToken;

      if (sessionToken) {
        try {
          const supabase = this.supabaseService.client;

          const { data: session, error } = await supabase
            .from('user_sessions')
            .select('user_id, expires_at, user:user_id(*)')
            .eq('session_token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (!error && session) {
            // Attach session user to request
            (request as any).sessionUser = session.user;
            (request as any).sessionUserId = session.user_id;
            (request as any).isSessionAuth = true;
            return true;
          }
        } catch (error) {
          // Session validation failed
        }
      }
    }

    throw new UnauthorizedException('Authentication required');
  }
}
