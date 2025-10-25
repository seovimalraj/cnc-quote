import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { HeatmapCell } from "../admin/admin/admin-health/admin-health.service";

export interface ErrorEvent {
  id: string;
  timestamp: string;
  module: string;
  status_code: number | null;
  error_message: string;
  stack_trace?: string;
  user_id?: string;
  request_id?: string;
  url?: string;
  user_agent?: string;
}

@Injectable()
export class AdminErrorsService {
  private readonly logger = new Logger(AdminErrorsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getErrorHeatmap(window: string = '1h'): Promise<HeatmapCell[]> {
    try {
      const windowMs = this.parseWindow(window);
      const since = new Date(Date.now() - windowMs).toISOString();

      const { data, error } = await this.supabase.client
        .from('error_events')
        .select('module, status_code')
        .gte('timestamp', since);

      if (error) {
        this.logger.error('Failed to get error heatmap data', error);
        return [];
      }

      // Aggregate by module and status code
      const heatmap = new Map<string, Map<string, number>>();

      data?.forEach(event => {
        const module = event.module || 'unknown';
        const statusCode = event.status_code?.toString() || 'unknown';

        if (!heatmap.has(module)) {
          heatmap.set(module, new Map());
        }

        const moduleMap = heatmap.get(module)!;
        moduleMap.set(statusCode, (moduleMap.get(statusCode) || 0) + 1);
      });

      // Convert to HeatmapCell array
      const result: HeatmapCell[] = [];
      heatmap.forEach((statusMap, module) => {
        statusMap.forEach((count, statusCode) => {
          result.push({
            x: module,
            y: statusCode,
            count,
          });
        });
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get error heatmap', error);
      return [];
    }
  }

  async getErrors(
    module?: string,
    statusCode?: string,
    window: string = '1h',
    limit: number = 100,
  ): Promise<ErrorEvent[]> {
    try {
      const windowMs = this.parseWindow(window);
      const since = new Date(Date.now() - windowMs).toISOString();

      let query = this.supabase.client
        .from('error_events')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (module) {
        query = query.eq('module', module);
      }

      if (statusCode && statusCode !== 'unknown') {
        query = query.eq('status_code', parseInt(statusCode));
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to get errors', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        module: row.module,
        status_code: row.status_code,
        error_message: row.error_message,
        stack_trace: row.stack_trace,
        user_id: row.user_id,
        request_id: row.request_id,
        url: row.url,
        user_agent: row.user_agent,
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get errors', error);
      return [];
    }
  }

  async storeErrorEvent(event: Partial<ErrorEvent>): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('error_events')
        .insert({
          timestamp: event.timestamp || new Date().toISOString(),
          module: event.module || 'unknown',
          status_code: event.status_code,
          error_message: event.error_message,
          stack_trace: event.stack_trace,
          user_id: event.user_id,
          request_id: event.request_id,
          url: event.url,
          user_agent: event.user_agent,
        });

      if (error) {
        this.logger.error('Failed to store error event', error);
      }
    } catch (error) {
      this.logger.error('Failed to store error event', error);
    }
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1h

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }
}
