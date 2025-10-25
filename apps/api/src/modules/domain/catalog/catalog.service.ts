import { Injectable } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { ContractsV1 } from '@cnc-quote/shared';
import { MaterialsService } from './materials.service';
import { FinishesService } from './finishes.service';

export interface MaterialCatalogItem {
  id: string;
  name: string;
  category: string;
  cost_per_kg: number;
  density: number;
  availability: boolean;
  lead_time_days: number;
  processes: ContractsV1.ProcessType[];
}

export interface FinishCatalogItem {
  id: string;
  name: string;
  category: string;
  cost_per_part?: number;
  cost_per_area?: number;
  lead_time_days: number;
  processes: ContractsV1.ProcessType[];
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly materialsService: MaterialsService,
    private readonly finishesService: FinishesService,
  ) {}

  async getCatalogStats(orgId: string) {
    // Get counts for each catalog type
    const [machines, materials, finishes, inspectionTemplates, qapTemplates] = await Promise.all([
      this.supabase.client
        .from('machines')
        .select('id', { count: 'exact', head: true })
        .or(`org_id.is.null,org_id.eq.${orgId}`),
      this.supabase.client
        .from('materials')
        .select('id', { count: 'exact', head: true })
        .or(`org_id.is.null,org_id.eq.${orgId}`),
      this.supabase.client
        .from('finishes')
        .select('id', { count: 'exact', head: true }),
      this.supabase.client
        .from('inspection_templates')
        .select('id', { count: 'exact', head: true }),
      this.supabase.client
        .from('qap_templates')
        .select('id', { count: 'exact', head: true })
        .or(`org_id.is.null,org_id.eq.${orgId}`),
    ]);

    return {
      machines: machines.count || 0,
      materials: materials.count || 0,
      finishes: finishes.count || 0,
      inspectionTemplates: inspectionTemplates.count || 0,
      qapTemplates: qapTemplates.count || 0,
    };
  }

  async exportCatalog(orgId: string, scope: string = 'all') {
    const exportData: any = {};

    if (scope === 'all' || scope === 'machines') {
      const { data: machines } = await this.supabase.client
        .from('machines')
        .select('*')
        .or(`org_id.is.null,org_id.eq.${orgId}`);
      exportData.machines = machines || [];
    }

    if (scope === 'all' || scope === 'materials') {
      const { data: materials } = await this.supabase.client
        .from('materials')
        .select('*')
        .or(`org_id.is.null,org_id.eq.${orgId}`);
      exportData.materials = materials || [];
    }

    if (scope === 'all' || scope === 'finishes') {
      const { data: finishes } = await this.supabase.client
        .from('finishes')
        .select('*');
      exportData.finishes = finishes || [];
    }

    if (scope === 'all' || scope === 'inspection-templates') {
      const { data: inspectionTemplates } = await this.supabase.client
        .from('inspection_templates')
        .select('*');
      exportData.inspectionTemplates = inspectionTemplates || [];
    }

    if (scope === 'all' || scope === 'qap-templates') {
      const { data: qapTemplates } = await this.supabase.client
        .from('qap_templates')
        .select('*')
        .or(`org_id.is.null,org_id.eq.${orgId}`);
      exportData.qapTemplates = qapTemplates || [];
    }

    return exportData;
  }

  async importCatalog(orgId: string, importData: any, userId: string) {
    const results = {
      machines: { created: 0, updated: 0, errors: 0 },
      materials: { created: 0, updated: 0, errors: 0 },
      finishes: { created: 0, updated: 0, errors: 0 },
      inspectionTemplates: { created: 0, updated: 0, errors: 0 },
      qapTemplates: { created: 0, updated: 0, errors: 0 },
    };

    // Import machines
    if (importData.machines) {
      for (const machine of importData.machines) {
        try {
          const { data: existing } = await this.supabase.client
            .from('machines')
            .select('id')
            .eq('name', machine.name)
            .or(`org_id.is.null,org_id.eq.${orgId}`)
            .single();

          if (existing) {
            await this.supabase.client
              .from('machines')
              .update({ ...machine, org_id: orgId, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            results.machines.updated++;
          } else {
            await this.supabase.client
              .from('machines')
              .insert({ ...machine, org_id: orgId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
            results.machines.created++;
          }
        } catch (error) {
          results.machines.errors++;
        }
      }
    }

    // Similar logic for other catalog types...
    // (Implementation would be similar for materials, finishes, etc.)

    return results;
  }

  /**
   * Get materials for instant quote catalog
   */
  async getMaterials(filters?: { 
    process_type?: ContractsV1.ProcessType;
    available_only?: boolean;
  }): Promise<MaterialCatalogItem[]> {
    // Fetch from real materials service
    const materials = await this.materialsService.getMaterials('', {
      process: filters?.process_type,
      includeInactive: !filters?.available_only,
    });

    // Transform to catalog format
    return materials.map(material => ({
      id: material.code,
      name: material.name,
      category: material.category?.code || 'unknown',
      cost_per_kg: material.cost_per_kg_base,
      density: material.density_kg_m3 / 1000, // Convert to g/cm³
      availability: material.is_active,
      lead_time_days: 1, // Default, could be derived from material properties
      processes: material.processes as ContractsV1.ProcessType[] || [],
    }));
  }

  /**
   * Get finishes for instant quote catalog
   */
  async getFinishes(filters?: {
    process_type?: ContractsV1.ProcessType;
    material_id?: string;
  }): Promise<FinishCatalogItem[]> {
    // Fetch from real finishes service
    const finishes = await this.finishesService.getFinishes({
      process: filters?.process_type,
    });

    // Transform to catalog format
    return finishes.map(finish => ({
      id: finish.id,
      name: finish.name,
      category: finish.process.toLowerCase(),
      cost_per_part: finish.rate_per_part_usd || undefined,
      cost_per_area: finish.rate_per_area_usd_m2 || undefined,
      lead_time_days: finish.lead_time_days,
      processes: [finish.process.toLowerCase() as ContractsV1.ProcessType],
    }));
  }

  /**
   * Get material by ID
   */
  async getMaterialById(id: string): Promise<MaterialCatalogItem | null> {
    try {
      const material = await this.materialsService.getMaterial(id);
      return {
        id: material.code,
        name: material.name,
        category: material.category?.code || 'unknown',
        cost_per_kg: material.cost_per_kg_base,
        density: material.density_kg_m3 / 1000,
        availability: material.is_active,
        lead_time_days: 1,
        processes: material.processes as ContractsV1.ProcessType[] || [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get finish by ID
   */
  async getFinishById(id: string): Promise<FinishCatalogItem | null> {
    try {
      const finish = await this.finishesService.getFinish(id);
      return {
        id: finish.id,
        name: finish.name,
        category: finish.process.toLowerCase(),
        cost_per_part: finish.rate_per_part_usd || undefined,
        cost_per_area: finish.rate_per_area_usd_m2 || undefined,
        lead_time_days: finish.lead_time_days,
        processes: [finish.process.toLowerCase() as ContractsV1.ProcessType],
      };
    } catch {
      return null;
    }
  }
}
