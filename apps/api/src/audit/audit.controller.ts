import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrgGuard } from '../auth/org.guard';
import { RbacGuard } from '../auth/rbac.middleware';
import { SupabaseService } from '../lib/supabase/supabase.service';

interface AuditListQuery {
  action?: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  from?: string;
  to?: string;
  limit?: string;
  cursor?: string;
}

function decodeCursor(cursor?: string): { created_at: string; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [created_at, id] = decoded.split('|');
    if (created_at && id) {
      return { created_at, id };
    }
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(created_at: string, id: string): string {
  return Buffer.from(`${created_at}|${id}`).toString('base64url');
}

@Controller('audit')
@UseGuards(JwtAuthGuard, OrgGuard)
export class AuditController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  @UseGuards(RbacGuard('audit:read', 'audit'))
  async list(@Req() req: any, @Query() query: AuditListQuery) {
    const orgId = req.rbac?.orgId;
    const parsedLimit = Number(query.limit ?? 50);
    const limitCandidate = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const limit = Math.min(limitCandidate, 200);
    const cursor = decodeCursor(query.cursor);

    let builder = this.supabase.client
      .from('audit_log')
      .select('id, created_at, action, user_id, resource_type, resource_id, request_id, trace_id, path, method')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (query.action) builder = builder.eq('action', query.action);
    if (query.user_id) builder = builder.eq('user_id', query.user_id);
    if (query.resource_type) builder = builder.eq('resource_type', query.resource_type);
    if (query.resource_id) builder = builder.eq('resource_id', query.resource_id);
    if (query.from) builder = builder.gte('created_at', query.from);
    if (query.to) builder = builder.lte('created_at', query.to);
    if (cursor) {
      builder = builder.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await builder;
    if (error) throw error;

    const hasNext = data.length > limit;
    const items = data.slice(0, limit);
    const nextCursor = hasNext
      ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
      : null;

    return {
      items,
      next_cursor: nextCursor,
    };
  }

  @Get(':id')
  @UseGuards(RbacGuard('audit:read', 'audit'))
  async getOne(@Req() req: any, @Param('id') id: string) {
    const orgId = req.rbac?.orgId;
    const { data, error } = await this.supabase.client
      .from('audit_log')
      .select('*')
      .eq('org_id', orgId)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return null;
    }
    return data;
  }
}
