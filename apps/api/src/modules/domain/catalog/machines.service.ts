import { Injectable } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { Machine } from "../../../../../packages/shared/src/types/schema";

@Injectable()
export class MachinesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMachines(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('machines')
      .select('*')
      .or(`org_id.is.null,org_id.eq.${orgId}`)
      .eq('archived', false);

    if (filters.process) {
      query = query.eq('process', filters.process);
    }

    if (filters.axes) {
      query = query.eq('axes', filters.axes);
    }

    if (filters.region) {
      query = query.eq('region', filters.region);
    }

    if (filters.availability) {
      query = query.eq('availability->>status', filters.availability);
    }

    if (filters.itar_mode === 'ITAR-Approved Only') {
      query = query.eq('itar_approved', true);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data } = await query.order('name');
    return data || [];
  }

  async getMachine(id: string, orgId: string) {
    const { data: machine } = await this.supabase.client
      .from('machines')
      .select('*')
      .eq('id', id)
      .or(`org_id.is.null,org_id.eq.${orgId}`)
      .single();

    return machine;
  }

  async createMachine(machineData: Partial<Machine>, orgId: string, userId: string) {
    const { data: machine } = await this.supabase.client
      .from('machines')
      .insert({
        ...machineData,
        org_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(machine.id, 'created', userId, { machineData });

    return machine;
  }

  async updateMachine(id: string, updates: Partial<Machine>, userId: string) {
    const { data: machine } = await this.supabase.client
      .from('machines')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'updated', userId, { updates });

    // Publish cache invalidation event
    await this.publishCacheInvalidation('machine.updated', { machineId: id });

    return machine;
  }

  async archiveMachine(id: string, userId: string) {
    const { data: machine } = await this.supabase.client
      .from('machines')
      .update({
        archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'archived', userId);

    return machine;
  }

  async duplicateMachine(id: string, orgId: string, userId: string) {
    const { data: originalMachine } = await this.supabase.client
      .from('machines')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalMachine) {
      throw new Error('Machine not found');
    }

    const { id: _, created_at, updated_at, ...machineData } = originalMachine;
    const newMachineData = {
      ...machineData,
      name: `${machineData.name} (Copy)`,
      org_id: orgId,
    };

    return this.createMachine(newMachineData, orgId, userId);
  }

  async recalculateAffectedQuotes(machineId: string, userId: string) {
    // This would trigger a background job to recalculate quotes that use this machine
    // For now, just log the event
    await this.logAuditEvent(machineId, 'recalc_quotes_triggered', userId);

    return { status: 'recalculation_queued' };
  }

  async bulkRateUpdate(machineIds: string[], rateUpdates: any, userId: string) {
    const updates = machineIds.map(id => ({
      id,
      hourly_rate_usd: rateUpdates.hourly_rate_usd,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      await this.supabase.client
        .from('machines')
        .update({
          hourly_rate_usd: update.hourly_rate_usd,
          updated_at: update.updated_at,
        })
        .eq('id', update.id);

      await this.logAuditEvent(update.id, 'bulk_rate_update', userId, { rateUpdates });
    }

    return { updated: machineIds.length };
  }

  async bulkExport(machineIds: string[], userId: string) {
    const { data: machines } = await this.supabase.client
      .from('machines')
      .select('*')
      .in('id', machineIds);

    return machines || [];
  }

  // Cache invalidation helper
  private async publishCacheInvalidation(event: string, data: any) {
    // Publish to Redis pub/sub for cache invalidation
    // Implementation depends on your Redis setup
  }

  // Audit logging
  private async logAuditEvent(machineId: string, action: string, userId: string, details?: any) {
    await this.supabase.client
      .from('catalog_audit')
      .insert({
        entity_type: 'machine',
        entity_id: machineId,
        action,
        user_id: userId,
        details,
        created_at: new Date().toISOString(),
      });
  }
}
