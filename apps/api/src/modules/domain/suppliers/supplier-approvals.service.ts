import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { ContractsV1 } from '@cnc-quote/shared';
import { trace } from '@opentelemetry/api';
import { MetricsService } from "../../core/metrics/metrics.service";
import { QuotesService } from "../../features/quotes/quotes.service";

@Injectable()
export class SupplierApprovalsService {
  private readonly logger = new Logger(SupplierApprovalsService.name);
  private readonly tracer = trace.getTracer('api.suppliers');

  constructor(
    private readonly supabase: SupabaseService,
    private readonly metrics: MetricsService,
    private readonly quotes: QuotesService,
  ) {}

  private resolveOrgId(user: any): string | null {
    return user?.orgId ?? user?.organizationId ?? user?.organization_id ?? null;
  }

  async recordApproval(
    supplierId: string,
    payload: Omit<ContractsV1.SupplierApprovalV1, 'version' | 'orgId' | 'supplierId' | 'createdAt' | 'createdBy'>,
    user: any,
  ): Promise<ContractsV1.SupplierApprovalV1> {
    const orgId = this.resolveOrgId(user);
    if (!orgId) throw new ForbiddenException('Organization context required');

    return this.tracer.startActiveSpan('supplier.approval.save', async (span) => {
      span.setAttributes({ 'org.id': orgId, 'supplier.id': supplierId, 'quote.id': payload.quoteId });
      try {
  const parsed = ContractsV1.SupplierApprovalSchemaV1.safeParse({ ...payload, version: 1, orgId, supplierId, createdBy: user?.userId ?? null });
        if (!parsed.success) {
          this.logger.warn('Invalid approval payload', parsed.error.flatten());
          throw new BadRequestException('Invalid approval payload');
        }
        const approval = parsed.data;

        const { data, error } = await this.supabase.client
          .from('supplier_approvals')
          .upsert(
            {
              org_id: orgId,
              supplier_id: supplierId,
              quote_id: approval.quoteId,
              approved: approval.approved,
              capacity_commitment: approval.capacityCommitment ?? null,
              expires_at: approval.expiresAt ?? null,
              notes: approval.notes ?? null,
              created_by: approval.createdBy ?? null,
            },
            { onConflict: 'org_id,supplier_id,quote_id' },
          )
          .select('*')
          .limit(1);
        if (error) throw error;
        const row = (data as any[])?.[0];
        if (!row) throw new Error('Empty approval upsert response');

        try {
          this.metrics.supplierApprovalTotal.inc({ org_id: orgId, supplier_id: supplierId, outcome: approval.approved ? 'approved' : 'rejected' });
        } catch (metricErr) {
          this.logger.debug('supplierApprovalTotal metric failed', metricErr);
        }

        const out: ContractsV1.SupplierApprovalV1 = {
          version: 1,
          orgId,
          supplierId,
          quoteId: row.quote_id,
          approved: Boolean(row.approved),
          capacityCommitment: row.capacity_commitment ?? null,
          expiresAt: row.expires_at ?? null,
          notes: row.notes ?? null,
          createdBy: row.created_by ?? null,
          createdAt: row.created_at ?? undefined,
        };

        // Readiness bridge: if approved and not expired, try to mark quote ready if pricing is current
        try {
          if (out.approved) {
            const nowIso = new Date().toISOString();
            if (!out.expiresAt || out.expiresAt > nowIso) {
              await this.quotes.markReadyIfCurrent(out.quoteId);
            }
          }
        } catch (bridgeErr) {
          this.logger.debug('readiness bridge skipped', bridgeErr as any);
        }
        return out;
      } catch (err) {
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async listApprovals(supplierId: string, user: any, quoteId?: string): Promise<ContractsV1.SupplierApprovalV1[]> {
    const orgId = this.resolveOrgId(user);
    if (!orgId) throw new ForbiddenException('Organization context required');

    return this.tracer.startActiveSpan('supplier.approval.list', async (span) => {
      span.setAttributes({ 'org.id': orgId, 'supplier.id': supplierId });
      try {
        let query = this.supabase.client
          .from('supplier_approvals')
          .select('*')
          .eq('org_id', orgId)
          .eq('supplier_id', supplierId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (quoteId) query = query.eq('quote_id', quoteId);

        const { data, error } = await query;
        if (error) throw error;
        const rows = (data as any[]) ?? [];
        return rows.map((row) => ({
          version: 1 as const,
          orgId,
          supplierId,
          quoteId: row.quote_id as string,
          approved: Boolean(row.approved),
          capacityCommitment: (row.capacity_commitment ?? null) as number | null,
          expiresAt: (row.expires_at ?? null) as string | null,
          notes: (row.notes ?? null) as string | null,
          createdBy: (row.created_by ?? null) as string | null,
          createdAt: (row.created_at ?? undefined) as string | undefined,
        }) as ContractsV1.SupplierApprovalV1);
      } catch (err) {
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
