import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { buildDiff } from '@cnc-quote/shared';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private readonly supabase: SupabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    const org = (request as any).org;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(async (data) => {
        if (user && org && method !== 'GET') {
          // Only log mutations
          const oldData = {}; // In a real impl, you'd fetch previous state
          const newData = data; // Response data
          const diff = buildDiff(oldData, newData); // Redact sensitive fields

          const { error } = await this.supabase.client
            .from('audit_log')
            .insert({
              org_id: org.id,
              user_id: user.id,
              action: `${method} ${url}`,
              entity_type: this.inferEntityType(url),
              entity_id: this.extractEntityId(url),
              old_data: oldData,
              new_data: newData,
              diff: diff,
              ip_address: request.ip,
              user_agent: request.get('User-Agent'),
            });

          if (error) {
            console.error('Audit logging error:', error);
          }
        }
      }),
    );
  }

  private inferEntityType(url: string): string {
    // Simple inference based on URL
    if (url.includes('/quotes')) return 'quote';
    if (url.includes('/users')) return 'user';
    if (url.includes('/orgs')) return 'org';
    return 'unknown';
  }

  private extractEntityId(url: string): string | null {
    // Extract ID from URL, e.g., /quotes/123 -> 123
    const match = /\/(\d+)(?:\/|$)/.exec(url);
    return match ? match[1] : null;
  }
}