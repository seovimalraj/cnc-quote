import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from "../lib/supabase/supabase.service";

@Injectable()
export class SessionValidationMiddleware implements NestMiddleware {
  constructor(private readonly supabaseService: SupabaseService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const sessionToken = req.headers['x-session-token'] as string ||
                        req.query.sessionToken as string ||
                        req.cookies?.sessionToken;

    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const supabase = this.supabaseService.client;

    // Validate session token
    const { data: session, error } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at, user:user_id(*)')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    // Attach user info to request
    (req as any).sessionUser = session.user;
    (req as any).sessionUserId = session.user_id;

    next();
  }
}
