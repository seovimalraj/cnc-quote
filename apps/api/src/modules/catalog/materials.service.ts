import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { Material } from '../../../../../packages/shared/src/types/schema';

@Injectable()
export class MaterialsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMaterials(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('materials')
      .select('*')
      .or(`org_id.is.null,org_id.eq.${orgId}`)
      .eq('retired', false);

    if (filters.process) {
      query = query.contains('processes', [filters.process]);
    }

    if (filters.family) {
      query = query.eq('family', filters.family);
    }

    if (filters.stock_form) {
      query = query.contains('stock_forms', [filters.stock_form]);
    }

    if (filters.region) {
      query = query.eq('region', filters.region);
    }

    if (filters.search) {
      query = query.or(`grade.ilike.%${filters.search}%,family.ilike.%${filters.search}%`);
    }

    const { data } = await query.order('family').order('grade');
    return data || [];
  }

  async getMaterial(id: string, orgId: string) {
    const { data: material } = await this.supabase.client
      .from('materials')
      .select('*')
      .eq('id', id)
      .or(`org_id.is.null,org_id.eq.${orgId}`)
      .single();

    return material;
  }

  async createMaterial(materialData: Partial<Material>, orgId: string, userId: string) {
    const { data: material } = await this.supabase.client
      .from('materials')
      .insert({
        ...materialData,
        org_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(material.id, 'created', userId, { materialData });

    return material;
  }

  async updateMaterial(id: string, updates: Partial<Material>, userId: string) {
    const { data: material } = await this.supabase.client
      .from('materials')
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
    await this.publishCacheInvalidation('material.updated', { materialId: id });

    return material;
  }

  async retireMaterial(id: string, userId: string) {
    const { data: material } = await this.supabase.client
      .from('materials')
      .update({
        retired: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Log audit event
    await this.logAuditEvent(id, 'retired', userId);

    return material;
  }

  async duplicateMaterial(id: string, orgId: string, userId: string) {
    const { data: originalMaterial } = await this.supabase.client
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalMaterial) {
      throw new Error('Material not found');
    }

    const { id: _, created_at, updated_at, ...materialData } = originalMaterial;
    const newMaterialData = {
      ...materialData,
      grade: `${materialData.grade} (Copy)`,
      org_id: orgId,
    };

    return this.createMaterial(newMaterialData, orgId, userId);
  }

  async invalidateCache(id: string, userId: string) {
    // Publish cache invalidation for pricing engine
    await this.publishCacheInvalidation('material.cache.invalidate', { materialId: id });

    // Log audit event
    await this.logAuditEvent(id, 'cache_invalidated', userId);

    return { status: 'cache_invalidated' };
  }

  async getMaterialFamilies() {
    const { data } = await this.supabase.client
      .from('materials')
      .select('family')
      .eq('retired', false);

    const families = [...new Set(data?.map(m => m.family) || [])];
    return families;
  }

  // Cache invalidation helper
  private async publishCacheInvalidation(event: string, data: any) {
    // Publish to Redis pub/sub for cache invalidation
  }

  // Audit logging
  private async logAuditEvent(materialId: string, action: string, userId: string, details?: any) {
    await this.supabase.client
      .from('catalog_audit')
      .insert({
        entity_type: 'material',
        entity_id: materialId,
        action,
        user_id: userId,
        details,
        created_at: new Date().toISOString(),
      });
  }
}
