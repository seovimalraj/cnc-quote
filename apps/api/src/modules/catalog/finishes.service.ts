import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { Finish } from '../../../../../packages/shared/src/types/schema';

@Injectable()
export class FinishesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getFinishes(filters: any = {}) {
    let query = this.supabase.client
      .from('finishes')
      .select('*')
      .eq('disabled', false);

    if (filters.process) {
      query = query.eq('process', filters.process);
    }

    if (filters.class) {
      query = query.ilike('class_spec', `%${filters.class}%`);
    }

    if (filters.capacity) {
      // Filter by max envelope dimensions
      query = query.or(`max_envelope_mm->>x.gte.${filters.capacity},max_envelope_mm->>y.gte.${filters.capacity},max_envelope_mm->>z.gte.${filters.capacity}`);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data } = await query.order('process').order('name');
    return data || [];
  }

  async getFinish(id: string) {
    const { data: finish } = await this.supabase.client
      .from('finishes')
      .select('*')
      .eq('id', id)
      .single();

    return finish;
  }

  async createFinish(finishData: Partial<Finish>, userId: string) {
    const { data: finish } = await this.supabase.client
      .from('finishes')
      .insert({
        ...finishData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(finish.id, 'created', userId, { finishData });

    return finish;
  }

  async updateFinish(id: string, updates: Partial<Finish>, userId: string) {
    const { data: finish } = await this.supabase.client
      .from('finishes')
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
    await this.publishCacheInvalidation('finish.updated', { finishId: id });

    return finish;
  }

  async disableFinish(id: string, userId: string) {
    const { data: finish } = await this.supabase.client
      .from('finishes')
      .update({
        disabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'disabled', userId);

    return finish;
  }

  async duplicateFinish(id: string, userId: string) {
    const { data: originalFinish } = await this.supabase.client
      .from('finishes')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalFinish) {
      throw new Error('Finish not found');
    }

    const { id: _, created_at, updated_at, ...finishData } = originalFinish;
    const newFinishData = {
      ...finishData,
      name: `${finishData.name} (Copy)`,
    };

    return this.createFinish(newFinishData, userId);
  }

  async getCompatibleMaterials(finishId: string) {
    const { data: finish } = await this.supabase.client
      .from('finishes')
      .select('material_whitelist, material_blacklist')
      .eq('id', finishId)
      .single();

    if (!finish) {
      throw new Error('Finish not found');
    }

    // Get materials that are compatible
    let query = this.supabase.client
      .from('materials')
      .select('id, grade, family')
      .eq('retired', false);

    if (finish.material_whitelist && finish.material_whitelist.length > 0) {
      query = query.in('family', finish.material_whitelist);
    }

    if (finish.material_blacklist && finish.material_blacklist.length > 0) {
      query = query.not('family', 'in', `(${finish.material_blacklist.join(',')})`);
    }

    const { data } = await query;
    return data || [];
  }

  // Cache invalidation helper
  private async publishCacheInvalidation(event: string, data: any) {
    // Publish to Redis pub/sub for cache invalidation
    console.log(`Publishing cache invalidation: ${event}`, data);
  }

  // Audit logging
  private async logAuditEvent(finishId: string, action: string, userId: string, details?: any) {
    await this.supabase.client
      .from('catalog_audit')
      .insert({
        entity_type: 'finish',
        entity_id: finishId,
        action,
        user_id: userId,
        details,
        created_at: new Date().toISOString(),
      });
  }
}
