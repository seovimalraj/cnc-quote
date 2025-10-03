import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase/supabase.service';
import { AuditRecord } from './audit.types';

const JSON_BYTE_LIMIT = 200_000;
const SENSITIVE_KEY_REGEX = /(token|secret|password|key|credential|email)/i;

function maskValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 128) {
      return `${value.slice(0, 64)}…[truncated]`;
    }
    return value;
  }
  return value;
}

export function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(redactSensitive);
  }
  if (input && typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>).map(([key, value]) => {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        return [key, '[redacted]'] as const;
      }
      return [key, redactSensitive(value)] as const;
    });
    return Object.fromEntries(entries);
  }
  return maskValue(input);
}

export function toJsonWithLimit(value: unknown): unknown {
  const sanitized = redactSensitive(value);
  try {
    const serialized = JSON.stringify(sanitized ?? null);
    if (Buffer.byteLength(serialized, 'utf8') > JSON_BYTE_LIMIT) {
      return { truncated: true };
    }
    return JSON.parse(serialized);
  } catch {
    return { serializationError: true };
  }
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(record: AuditRecord): Promise<void> {
    if (process.env.AUDIT_ENABLED && process.env.AUDIT_ENABLED.toString().toLowerCase() === 'false') {
      return;
    }

    if (!record?.ctx?.orgId) {
      return;
    }

    try {
      const before_json = toJsonWithLimit(record.before);
      const after_json = toJsonWithLimit(record.after);

      const { error, data } = await this.supabase.client
        .from('audit_log')
        .insert({
          org_id: record.ctx.orgId,
          user_id: record.ctx.userId ?? null,
          action: record.action,
          resource_type: record.resourceType,
          resource_id: record.resourceId ?? null,
          before_json,
          after_json,
          ip: record.ctx.ip ?? null,
          ua: record.ctx.ua ?? null,
          request_id: record.ctx.requestId ?? null,
          trace_id: record.ctx.traceId ?? null,
          path: record.ctx.path ?? null,
          method: record.ctx.method ?? null,
        })
        .select('id, trace_id')
        .single();

      if (error) {
        throw error;
      }

      this.logger.log({
        event: 'audit.write',
        id: data?.id,
        action: record.action,
        org_id: record.ctx.orgId,
        resource_type: record.resourceType,
        resource_id: record.resourceId ?? null,
        trace_id: record.ctx.traceId ?? null,
      });
    } catch (error) {
      this.logger.error(`Failed to persist audit log: ${error instanceof Error ? error.message : error}`);
    }
  }
}
