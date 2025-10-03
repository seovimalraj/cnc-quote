import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase/supabase.service';

/**
 * Nightly cleanup job honouring audit_log_retention per org.
 * Wire into the scheduler/queue worker rather than API runtime.
 */
@Injectable()
export class AuditRetentionJob {
  private readonly logger = new Logger(AuditRetentionJob.name);

  constructor(private readonly supabase: SupabaseService) {}

  async run(): Promise<void> {
    const { data: retentionPolicies, error } = await this.supabase.client
      .from('audit_log_retention')
      .select('org_id, days');

    if (error) {
      this.logger.error(`Failed to load audit retention policies: ${error.message}`);
      return;
    }

    const now = new Date();
    for (const policy of retentionPolicies || []) {
      const cutoff = new Date(now.getTime() - Number(policy.days ?? 365) * 24 * 60 * 60 * 1000);
      const { error: deleteError } = await this.supabase.client
        .from('audit_log')
        .delete()
        .eq('org_id', policy.org_id)
        .lt('created_at', cutoff.toISOString());

      if (deleteError) {
        this.logger.error(
          `Failed to purge audit rows for org=${policy.org_id}: ${deleteError.message}`,
        );
      }
    }
  }
}
