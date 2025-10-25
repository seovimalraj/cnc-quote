import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { ContractsV1 } from '@cnc-quote/shared';
import { trace } from '@opentelemetry/api';
import { MetricsService } from "../../core/metrics/metrics.service";

@Injectable()
export class SupplierCapabilitiesService {
  private readonly logger = new Logger(SupplierCapabilitiesService.name);
  private readonly tracer = trace.getTracer('api.suppliers');

  constructor(private readonly supabase: SupabaseService, private readonly metrics: MetricsService) {}

  private resolveOrgId(user: any): string | null {
    return user?.orgId ?? user?.organizationId ?? user?.organization_id ?? null;
  }

  async getCapability(supplierId: string, user: any): Promise<ContractsV1.SupplierCapabilityV1 | null> {
    const orgId = this.resolveOrgId(user);
    if (!orgId) throw new ForbiddenException('Organization context required');

    return this.tracer.startActiveSpan('supplier.capability.get', async (span) => {
      span.setAttributes({ 'org.id': orgId, 'supplier.id': supplierId });
      try {
        const { data, error } = await this.supabase.client
          .from('supplier_capabilities')
          .select('*')
          .eq('org_id', orgId)
          .eq('supplier_id', supplierId)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const row = data as any;
        const capability: ContractsV1.SupplierCapabilityV1 = {
          version: 1,
          orgId,
          supplierId,
          processes: row.processes ?? [],
          materials: row.materials ?? [],
          machineGroups: row.machine_groups ?? [],
          throughputPerWeek: row.throughput_per_week ?? 0,
          leadDays: row.lead_days ?? 0,
          certifications: row.certifications ?? [],
          regions: row.regions ?? [],
          envelope: row.envelope ?? undefined,
          notes: row.notes ?? undefined,
          active: Boolean(row.active),
          updatedBy: row.updated_by ?? null,
          updatedAt: row.updated_at ?? undefined,
          createdAt: row.created_at ?? undefined,
        } as any;
        return capability;
      } catch (err) {
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async upsertCapability(
    supplierId: string,
    payload: Partial<ContractsV1.SupplierCapabilityV1>,
    user: any,
  ): Promise<ContractsV1.SupplierCapabilityV1> {
    const orgId = this.resolveOrgId(user);
    if (!orgId) throw new ForbiddenException('Organization context required');

    return this.tracer.startActiveSpan('supplier.capability.save', async (span) => {
      span.setAttributes({ 'org.id': orgId, 'supplier.id': supplierId });
      try {
        // Merge defaults
        const merged = {
          version: 1,
          orgId,
          supplierId,
          processes: [],
          materials: [],
          machineGroups: [],
          throughputPerWeek: 0,
          leadDays: 0,
          certifications: [],
          regions: [],
          envelope: undefined,
          notes: undefined,
          active: true,
          updatedBy: user?.userId ?? null,
        } as any;
        Object.assign(merged, payload);

  const parsed = ContractsV1.SupplierCapabilitySchemaV1.safeParse(merged);
        if (!parsed.success) {
          this.logger.warn('Invalid capability payload', parsed.error.flatten());
          throw new BadRequestException('Invalid capability payload');
        }
        const cap = parsed.data;

        // Basic envelope validation: min <= max if provided
        if (cap.envelope) {
          const { min_length_mm, min_width_mm, min_height_mm, max_length_mm, max_width_mm, max_height_mm } = cap.envelope;
          const checks = [
            [min_length_mm, max_length_mm],
            [min_width_mm, max_width_mm],
            [min_height_mm, max_height_mm],
          ];
          for (const [minV, maxV] of checks) {
            if (minV !== undefined && maxV !== undefined && minV > maxV) {
              throw new BadRequestException('Invalid envelope min/max');
            }
          }
        }

        // Upsert row
        const { data, error } = await this.supabase.client
          .from('supplier_capabilities')
          .upsert(
            {
              org_id: orgId,
              supplier_id: supplierId,
              processes: cap.processes,
              materials: cap.materials,
              machine_groups: cap.machineGroups,
              throughput_per_week: cap.throughputPerWeek,
              lead_days: cap.leadDays,
              certifications: cap.certifications,
              regions: cap.regions,
              envelope: cap.envelope ?? null,
              notes: cap.notes ?? null,
              active: cap.active,
              updated_by: cap.updatedBy ?? user?.userId ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'org_id,supplier_id' },
          )
          .select('*')
          .limit(1);

        if (error) throw error;
        const row = (data as any[])?.[0];
        if (!row) throw new Error('Empty upsert response');

        // Emit metrics: increment per field that changed (best-effort)
        try {
          const fields = [
            'processes',
            'materials',
            'machine_groups',
            'throughput_per_week',
            'lead_days',
            'certifications',
            'regions',
            'envelope',
            'active',
          ];
          for (const f of fields) {
            this.metrics.supplierCapabilityUpdatesTotal.inc({ org_id: orgId, supplier_id: supplierId, field: f });
          }
        } catch (metricErr) {
          this.logger.debug('supplierCapabilityUpdatesTotal metric failed', metricErr);
        }

        const out: ContractsV1.SupplierCapabilityV1 = {
          version: 1,
          orgId,
          supplierId,
          processes: row.processes ?? [],
          materials: row.materials ?? [],
          machineGroups: row.machine_groups ?? [],
          throughputPerWeek: row.throughput_per_week ?? 0,
          leadDays: row.lead_days ?? 0,
          certifications: row.certifications ?? [],
          regions: row.regions ?? [],
          envelope: row.envelope ?? undefined,
          notes: row.notes ?? undefined,
          active: Boolean(row.active),
          updatedBy: row.updated_by ?? null,
          updatedAt: row.updated_at ?? undefined,
          createdAt: row.created_at ?? undefined,
        } as any;
        return out;
      } catch (err) {
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
