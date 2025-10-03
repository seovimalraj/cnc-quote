import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';
import {
  MaterialAlias,
  MaterialCategory,
  MaterialDetail,
  MaterialRegion,
  MaterialRegionMultiplier,
} from '../../../../../packages/shared/src/types/schema';
import { CreateMaterialDto, RegionMultiplierDto } from '../../materials/dto/create-material.dto';
import { UpdateMaterialDto } from '../../materials/dto/update-material.dto';

type MaterialFilters = {
  search?: string;
  process?: string;
  region?: MaterialRegion;
  categoryCode?: string;
  includeInactive?: boolean;
};

type MaterialActorContext = {
  orgId?: string | null;
  actorId?: string | null;
};

type MaterialRow = {
  id: string;
  category_id: string;
  code: string;
  name: string;
  standard: string | null;
  composition_json: Record<string, unknown> | null;
  processes: string[] | null;
  available_regions: string[] | null;
  density_kg_m3: number;
  machinability_index: number;
  hardness_hb: number | null;
  tensile_mpa: number | null;
  melting_c: number | null;
  cost_per_kg_base: number;
  supplier_ref: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: MaterialCategory | MaterialCategory[] | null;
  region_multipliers?: MaterialRegionMultiplier[] | null;
  aliases?: MaterialAlias[] | null;
};

const MATERIAL_SELECT = `
  id,
  category_id,
  code,
  name,
  standard,
  composition_json,
  processes,
  available_regions,
  density_kg_m3,
  machinability_index,
  hardness_hb,
  tensile_mpa,
  melting_c,
  cost_per_kg_base,
  supplier_ref,
  is_active,
  created_at,
  updated_at,
  category:material_categories ( id, code, name, created_at ),
  region_multipliers:material_region_multipliers ( id, material_id, region, multiplier ),
  aliases:material_aliases ( id, material_id, alias )
`;

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);
  private static readonly DETAIL_TTL_SECONDS = 300;
  private static readonly LIST_TTL_SECONDS = 120;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async listCategories(): Promise<MaterialCategory[]> {
    const { data, error } = await this.supabase.client
      .from('material_categories')
      .select('id, code, name, created_at')
      .order('name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to load material categories: ${error.message}`);
      throw new InternalServerErrorException('Failed to load material categories');
    }

    return data ?? [];
  }

  async getMaterials(orgId: string, filters: MaterialFilters = {}): Promise<MaterialDetail[]> {
    const cacheKey = this.buildListCacheKey(filters);
    const cached = await this.cache.get<MaterialDetail[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = this.supabase.client
      .from('material_properties')
      .select(MATERIAL_SELECT)
      .order('name', { ascending: true });

    if (!filters.includeInactive) {
      query.eq('is_active', true);
    }

    if (filters.process) {
      query.contains('processes', [filters.process]);
    }

    if (filters.region) {
      query.contains('available_regions', [filters.region]);
    }

    if (filters.search) {
      query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
    }

    if (filters.categoryCode) {
      const categoryId = await this.resolveCategoryId(filters.categoryCode);
      if (!categoryId) {
        return [];
      }
      query.eq('category_id', categoryId);
    }

  const { data, error } = await query;
    if (error) {
      this.logger.error(`Failed to fetch materials: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch materials');
    }

  const materials = ((data ?? []) as MaterialRow[]).map((row) => this.toMaterialDetail(row));
    await this.cache.set(cacheKey, materials, MaterialsService.LIST_TTL_SECONDS);
    return materials;
  }

  async getMaterial(id: string): Promise<MaterialDetail> {
    const cacheKey = this.buildDetailCacheKey(id);
    const cached = await this.cache.get<MaterialDetail>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase.client
      .from('material_properties')
      .select(MATERIAL_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to load material ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to load material');
    }

    if (!data) {
      throw new NotFoundException('Material not found');
    }

  const material = this.toMaterialDetail(data as MaterialRow);
    await this.cache.set(cacheKey, material, MaterialsService.DETAIL_TTL_SECONDS);
    return material;
  }

  async createMaterial(dto: CreateMaterialDto, _context?: MaterialActorContext): Promise<MaterialDetail> {
    const category = await this.resolveCategoryByCode(dto.category_code);
    if (!category) {
      throw new BadRequestException(`Unknown material category code: ${dto.category_code}`);
    }

    const payload = this.buildMaterialInsertPayload(dto, category.id);
    const { data, error } = await this.supabase.client
      .from('material_properties')
      .insert(payload)
      .select(MATERIAL_SELECT)
      .single();

    if (error) {
      this.logger.error(`Failed to create material: ${error.message}`);
      if (error.code === '23505') {
        throw new BadRequestException('Material code must be unique');
      }
      throw new InternalServerErrorException('Failed to create material');
    }

    await this.syncRegionMultipliers(data.id, dto.region_multipliers ?? []);
    await this.syncAliases(data.id, dto.aliases ?? []);
    await this.invalidateCacheForMaterial(data.id);

    return this.getMaterial(data.id);
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto, _context?: MaterialActorContext): Promise<MaterialDetail> {
    await this.ensureMaterialExists(id);

    const updatePayload: Record<string, unknown> = {};

    if (dto.category_code) {
      const category = await this.resolveCategoryByCode(dto.category_code);
      if (!category) {
        throw new BadRequestException(`Unknown material category code: ${dto.category_code}`);
      }
      updatePayload.category_id = category.id;
    }

    if (dto.code !== undefined) updatePayload.code = dto.code;
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.standard !== undefined) updatePayload.standard = dto.standard ?? null;
    if (dto.composition_json !== undefined) updatePayload.composition_json = dto.composition_json ?? {};
    if (dto.density_kg_m3 !== undefined) updatePayload.density_kg_m3 = dto.density_kg_m3;
    if (dto.machinability_index !== undefined) updatePayload.machinability_index = dto.machinability_index;
    if (dto.hardness_hb !== undefined) updatePayload.hardness_hb = dto.hardness_hb ?? null;
    if (dto.tensile_mpa !== undefined) updatePayload.tensile_mpa = dto.tensile_mpa ?? null;
    if (dto.melting_c !== undefined) updatePayload.melting_c = dto.melting_c ?? null;
    if (dto.cost_per_kg_base !== undefined) updatePayload.cost_per_kg_base = dto.cost_per_kg_base;
    if (dto.supplier_ref !== undefined) updatePayload.supplier_ref = dto.supplier_ref ?? null;
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;
    if (dto.processes !== undefined) updatePayload.processes = this.sanitizeStringArray(dto.processes);

    if (dto.available_regions !== undefined) {
      updatePayload.available_regions = this.sanitizeRegionArray(dto.available_regions);
    } else if (dto.region_multipliers !== undefined) {
      updatePayload.available_regions = dto.region_multipliers.map((m) => m.region);
    }

    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_at = new Date().toISOString();
      const { error: updateError } = await this.supabase.client
        .from('material_properties')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        this.logger.error(`Failed to update material ${id}: ${updateError.message}`);
        if (updateError.code === '23505') {
          throw new BadRequestException('Material code must be unique');
        }
        throw new InternalServerErrorException('Failed to update material');
      }
    }

    if (dto.region_multipliers !== undefined) {
      await this.syncRegionMultipliers(id, dto.region_multipliers ?? []);
    }

    if (dto.aliases !== undefined) {
      await this.syncAliases(id, dto.aliases ?? []);
    }

    await this.invalidateCacheForMaterial(id);
    return this.getMaterial(id);
  }

  async retireMaterial(id: string, _context?: MaterialActorContext): Promise<MaterialDetail> {
    const material = await this.updateMaterial(id, { is_active: false });
    return material;
  }

  async duplicateMaterial(id: string, _context?: MaterialActorContext): Promise<MaterialDetail> {
    const original = await this.getMaterial(id);
    const categoryCode = original.category?.code;
    if (!categoryCode) {
      throw new BadRequestException('Original material is missing a category reference');
    }

    const clonedCode = await this.generateDuplicateCode(original.code);

    const dto: CreateMaterialDto = {
      code: clonedCode,
      name: `${original.name} Copy`,
      category_code: categoryCode,
      standard: original.standard ?? undefined,
      composition_json: original.composition_json ?? undefined,
      density_kg_m3: original.density_kg_m3,
      machinability_index: original.machinability_index,
      hardness_hb: original.hardness_hb ?? undefined,
      tensile_mpa: original.tensile_mpa ?? undefined,
      melting_c: original.melting_c ?? undefined,
      cost_per_kg_base: original.cost_per_kg_base,
      supplier_ref: original.supplier_ref ?? undefined,
      is_active: original.is_active,
      aliases: (original.aliases ?? []).map((alias) => alias.alias),
      processes: this.sanitizeStringArray(original.processes ?? []),
      available_regions: this.sanitizeRegionArray(original.available_regions ?? []),
      region_multipliers: (original.region_multipliers ?? []).map((multiplier) => ({
        region: multiplier.region,
        multiplier: multiplier.multiplier,
      })),
    };

    return this.createMaterial(dto);
  }

  async invalidateCache(id: string): Promise<{ status: string }> {
    await this.invalidateCacheForMaterial(id);
    return { status: 'cache_invalidated' };
  }

  async getMaterialFamilies(): Promise<string[]> {
    const categories = await this.listCategories();
    return categories.map((category) => category.code);
  }

  private async resolveCategoryId(code: string): Promise<string | null> {
    const category = await this.resolveCategoryByCode(code);
    return category?.id ?? null;
  }

  private async resolveCategoryByCode(code: string): Promise<MaterialCategory | null> {
    const normalized = code.trim().toUpperCase();
    const { data, error } = await this.supabase.client
      .from('material_categories')
      .select('id, code, name, created_at')
      .eq('code', normalized)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to resolve material category ${code}: ${error.message}`);
      throw new InternalServerErrorException('Failed to resolve material category');
    }

    return data ?? null;
  }

  private buildMaterialInsertPayload(dto: CreateMaterialDto, categoryId: string) {
    const availableRegions = dto.available_regions ?? dto.region_multipliers?.map((m) => m.region) ?? [];
    return {
      category_id: categoryId,
      code: dto.code,
      name: dto.name,
      standard: dto.standard ?? null,
      composition_json: dto.composition_json ?? {},
      processes: this.sanitizeStringArray(dto.processes ?? []),
      available_regions: this.sanitizeRegionArray(availableRegions),
      density_kg_m3: dto.density_kg_m3,
      machinability_index: dto.machinability_index,
      hardness_hb: dto.hardness_hb ?? null,
      tensile_mpa: dto.tensile_mpa ?? null,
      melting_c: dto.melting_c ?? null,
      cost_per_kg_base: dto.cost_per_kg_base,
      supplier_ref: dto.supplier_ref ?? null,
      is_active: dto.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private async ensureMaterialExists(id: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('material_properties')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to check material ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to load material');
    }

    if (!data) {
      throw new NotFoundException('Material not found');
    }
  }

  private toMaterialDetail(row: MaterialRow): MaterialDetail {
    const processes = this.sanitizeStringArray(row.processes ?? []);
    const availableRegions = this.sanitizeRegionArray(row.available_regions ?? []);
    const aliases = (row.aliases ?? []).map((alias) => ({
      id: alias.id,
      material_id: alias.material_id ?? row.id,
      alias: alias.alias,
    }));

    const regionMultipliers = (row.region_multipliers ?? []).map((multiplier) => ({
      id: multiplier.id,
      material_id: multiplier.material_id ?? row.id,
      region: multiplier.region as MaterialRegion,
      multiplier: Number(multiplier.multiplier),
    }));

    const category = Array.isArray(row.category) ? row.category[0] ?? null : row.category ?? null;

    return {
      id: row.id,
      category_id: row.category_id,
      code: row.code,
      name: row.name,
      standard: row.standard ?? null,
      composition_json: row.composition_json ?? {},
      processes,
      available_regions: availableRegions,
      density_kg_m3: row.density_kg_m3,
      machinability_index: row.machinability_index,
      hardness_hb: row.hardness_hb,
      tensile_mpa: row.tensile_mpa,
      melting_c: row.melting_c,
      cost_per_kg_base: row.cost_per_kg_base,
      supplier_ref: row.supplier_ref,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: category ?? undefined,
      aliases,
      region_multipliers: regionMultipliers,
    };
  }

  private sanitizeStringArray(values: string[]): string[] {
    const unique = new Set((values ?? []).map((value) => value.trim()).filter(Boolean));
    return Array.from(unique);
  }

  private sanitizeRegionArray(values: string[]): MaterialRegion[] {
    const unique = new Set((values ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean));
    return Array.from(unique) as MaterialRegion[];
  }

  private async syncRegionMultipliers(materialId: string, multipliers: RegionMultiplierDto[]): Promise<void> {
    const sanitized = this.dedupeMultipliers(multipliers ?? []);

    const { error: deleteError } = await this.supabase.client
      .from('material_region_multipliers')
      .delete()
      .eq('material_id', materialId);

    if (deleteError) {
      this.logger.error(`Failed clearing multipliers for material ${materialId}: ${deleteError.message}`);
      throw new InternalServerErrorException('Failed to update material region multipliers');
    }

    if (sanitized.length === 0) {
      return;
    }

    const rows = sanitized.map((entry) => ({
      material_id: materialId,
      region: entry.region,
      multiplier: entry.multiplier,
    }));

    const { error } = await this.supabase.client
      .from('material_region_multipliers')
      .insert(rows);

    if (error) {
      this.logger.error(`Failed inserting multipliers for material ${materialId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to update material region multipliers');
    }
  }

  private dedupeMultipliers(multipliers: RegionMultiplierDto[]): RegionMultiplierDto[] {
    const map = new Map<string, RegionMultiplierDto>();
    for (const entry of multipliers) {
      const key = entry.region.toUpperCase();
      if (!map.has(key) || (entry.multiplier ?? 0) > 0) {
        map.set(key, { region: key, multiplier: Number(entry.multiplier) });
      }
    }
    return Array.from(map.values());
  }

  private async syncAliases(materialId: string, aliases: string[]): Promise<void> {
    const sanitized = this.sanitizeStringArray(aliases ?? []);

    const { error: deleteError } = await this.supabase.client
      .from('material_aliases')
      .delete()
      .eq('material_id', materialId);

    if (deleteError) {
      this.logger.error(`Failed clearing aliases for material ${materialId}: ${deleteError.message}`);
      throw new InternalServerErrorException('Failed to update material aliases');
    }

    if (sanitized.length === 0) {
      return;
    }

    const rows = sanitized.map((alias) => ({
      material_id: materialId,
      alias,
    }));

    const { error } = await this.supabase.client
      .from('material_aliases')
      .insert(rows);

    if (error) {
      this.logger.error(`Failed inserting aliases for material ${materialId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to update material aliases');
    }
  }

  private async invalidateCacheForMaterial(materialId: string): Promise<void> {
    await this.cache.del(this.buildDetailCacheKey(materialId));
    await this.invalidateMaterialLists();
  }

  private async invalidateMaterialLists(): Promise<void> {
    try {
      const keys = await this.cache.keys('materials:list:*');
      await Promise.all(keys.map((key) => this.cache.del(key)));
    } catch (error) {
      this.logger.warn(`Failed to invalidate material list caches: ${(error as Error).message}`);
    }
  }

  private buildListCacheKey(filters: MaterialFilters): string {
    const entries = Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value.join(',')] as [string, string];
        }
        return [key, String(value)] as [string, string];
      })
      .sort(([a], [b]) => a.localeCompare(b));

  const serialized = entries.map(([key, value]) => `${key}:${value}`).join('|');
  return `materials:list:${serialized || 'all'}`;
  }

  private buildDetailCacheKey(id: string): string {
    return `materials:detail:${id}`;
  }

  private async generateDuplicateCode(baseCode: string): Promise<string> {
    let attempt = `${baseCode}_COPY`;
    let counter = 1;

    while (await this.materialCodeExists(attempt)) {
      attempt = `${baseCode}_COPY${counter}`;
      counter += 1;
    }

    return attempt;
  }

  private async materialCodeExists(code: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('material_properties')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed checking for material code ${code}: ${error.message}`);
      throw new InternalServerErrorException('Failed to check material code availability');
    }

    return Boolean(data);
  }
}
