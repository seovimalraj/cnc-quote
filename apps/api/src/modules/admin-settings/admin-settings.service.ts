import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';

export interface AuditLogEvent {
  id: string;
  ts: string;
  actor_user_id: string;
  actor_role: string;
  ip: string;
  area: string;
  action: string;
  target_id?: string;
  before?: any;
  after?: any;
  notes?: string;
}

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async logAuditEvent(event: Omit<AuditLogEvent, 'id' | 'ts'>): Promise<void> {
    try {
      const auditEvent = {
        ...event,
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        ts: new Date().toISOString(),
      };

      const { error } = await this.supabase.client
        .from('audit_events')
        .insert(auditEvent);

      if (error) {
        this.logger.error('Failed to log audit event', error);
      }
    } catch (error) {
      this.logger.error('Failed to log audit event', error);
    }
  }

  async getAuditEvents(filters: {
    date_from?: string;
    date_to?: string;
    actor_user_id?: string;
    area?: string[];
    action?: string[];
    ip?: string;
    limit?: number;
  }): Promise<AuditLogEvent[]> {
    try {
      let query = this.supabase.client
        .from('audit_events')
        .select('*')
        .order('ts', { ascending: false })
        .limit(filters.limit || 100);

      if (filters.date_from) {
        query = query.gte('ts', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('ts', filters.date_to);
      }

      if (filters.actor_user_id) {
        query = query.eq('actor_user_id', filters.actor_user_id);
      }

      if (filters.area?.length) {
        query = query.in('area', filters.area);
      }

      if (filters.action?.length) {
        query = query.in('action', filters.action);
      }

      if (filters.ip) {
        query = query.ilike('ip', `%${filters.ip}%`);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to get audit events', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        ts: row.ts,
        actor_user_id: row.actor_user_id,
        actor_role: row.actor_role,
        ip: row.ip,
        area: row.area,
        action: row.action,
        target_id: row.target_id,
        before: row.before,
        after: row.after,
        notes: row.notes,
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get audit events', error);
      return [];
    }
  }

  async exportAuditEvents(filters: typeof this.getAuditEvents extends (f: infer T) => any ? T : never, format: 'csv' | 'jsonl'): Promise<string> {
    const events = await this.getAuditEvents(filters);

    if (format === 'csv') {
      return this.convertToCSV(events);
    } else {
      return this.convertToJSONL(events);
    }
  }

  private convertToCSV(events: AuditLogEvent[]): string {
    const headers = ['ts', 'actor_user_id', 'actor_role', 'ip', 'area', 'action', 'target_id', 'notes'];
    const rows = events.map(event => [
      event.ts,
      event.actor_user_id,
      event.actor_role,
      event.ip,
      event.area,
      event.action,
      event.target_id || '',
      event.notes || '',
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  }

  private convertToJSONL(events: AuditLogEvent[]): string {
    return events.map(event => JSON.stringify(event)).join('\n');
  }
}
