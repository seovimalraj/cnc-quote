import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { createHash } from 'crypto';

/**
 * Nightly cleanup job honouring audit_log_retention per org.
 * Wire into the scheduler/queue worker rather than API runtime.
 */
@Injectable()
export class AuditRetentionJob {
  private readonly logger = new Logger(AuditRetentionJob.name);
  private readonly BATCH_SIZE = parseInt(process.env.AUDIT_RETENTION_BATCH_SIZE || '1000', 10);
  private readonly TIMEOUT_MS = parseInt(process.env.AUDIT_RETENTION_TIMEOUT_MS || '30000', 10);

  constructor(private readonly supabase: SupabaseService) {}

  private hashOrgId(orgId: string): string {
    return createHash('sha256').update(orgId).digest('hex').substring(0, 16);
  }

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
      const orgIdHash = this.hashOrgId(policy.org_id);
      let totalDeleted = 0;
      const startTime = Date.now();

      try {
        // Batch delete loop with timeout protection
        while (true) {
          if (Date.now() - startTime > this.TIMEOUT_MS) {
            this.logger.warn(`Audit retention timeout for org_hash=${orgIdHash}, deleted ${totalDeleted} rows`);
            break;
          }

          const { data, error: deleteError, count } = await this.supabase.client
            .from('audit_log')
            .delete({ count: 'exact' })
            .eq('org_id', policy.org_id)
            .lt('created_at', cutoff.toISOString())
            .limit(this.BATCH_SIZE);

          if (deleteError) {
            this.logger.error(
              `Failed to purge audit batch for org_hash=${orgIdHash}: ${deleteError.message}`,
            );
            break;
          }

          const batchDeleted = count || 0;
          totalDeleted += batchDeleted;
          this.logger.debug(`Deleted ${batchDeleted} audit rows for org_hash=${orgIdHash}`);

          // Exit if no more rows to delete
          if (batchDeleted === 0 || batchDeleted < this.BATCH_SIZE) {
            break;
          }
        }

        this.logger.log(`Audit retention completed for org_hash=${orgIdHash}: deleted ${totalDeleted} rows`);
      } catch (err) {
        this.logger.error(`Audit retention error for org_hash=${orgIdHash}: ${err}`);
      }
    }
  }
}
