import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { ContractsV1 } from '@cnc-quote/shared';

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
  constructor(private readonly supabase: SupabaseService) {}

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
    // Mock data for instant quote - in production, fetch from materials table
    const materials: MaterialCatalogItem[] = [
      {
        id: 'al6061t6',
        name: 'Aluminum 6061-T6',
        category: 'aluminum',
        cost_per_kg: 4.50,
        density: 2700,
        availability: true,
        lead_time_days: 1,
        processes: ['cnc_milling', 'cnc_turning', 'sheet_metal_laser'],
      },
      {
        id: 'al7075t6',
        name: 'Aluminum 7075-T6',
        category: 'aluminum',
        cost_per_kg: 6.80,
        density: 2810,
        availability: true,
        lead_time_days: 2,
        processes: ['cnc_milling', 'cnc_turning'],
      },
      {
        id: 'steel1018',
        name: 'Steel 1018',
        category: 'steel',
        cost_per_kg: 2.20,
        density: 7870,
        availability: true,
        lead_time_days: 1,
        processes: ['cnc_milling', 'cnc_turning', 'sheet_metal_laser'],
      },
      {
        id: 'ss304',
        name: 'Stainless Steel 304',
        category: 'stainless',
        cost_per_kg: 8.50,
        density: 8000,
        availability: true,
        lead_time_days: 2,
        processes: ['cnc_milling', 'cnc_turning', 'sheet_metal_laser'],
      },
    ];

    let filtered = materials;

    if (filters?.process_type) {
      filtered = filtered.filter(m => m.processes.includes(filters.process_type));
    }

    if (filters?.available_only) {
      filtered = filtered.filter(m => m.availability);
    }

    return filtered;
  }

  /**
   * Get finishes for instant quote catalog
   */
  async getFinishes(filters?: {
    process_type?: ContractsV1.ProcessType;
    material_id?: string;
  }): Promise<FinishCatalogItem[]> {
    // Mock data for instant quote
    const finishes: FinishCatalogItem[] = [
      {
        id: 'anodize_clear',
        name: 'Clear Anodize Type II',
        category: 'anodizing',
        cost_per_area: 0.12,
        lead_time_days: 3,
        processes: ['cnc_milling', 'cnc_turning', 'sheet_metal_laser'],
      },
      {
        id: 'anodize_black',
        name: 'Black Anodize Type II',
        category: 'anodizing',
        cost_per_area: 0.15,
        lead_time_days: 3,
        processes: ['cnc_milling', 'cnc_turning', 'sheet_metal_laser'],
      },
      {
        id: 'powder_coat_black',
        name: 'Black Powder Coat',
        category: 'coating',
        cost_per_area: 0.08,
        lead_time_days: 5,
        processes: ['cnc_milling', 'sheet_metal_laser'],
      },
      {
        id: 'as_machined',
        name: 'As Machined',
        category: 'machined',
        cost_per_part: 0,
        lead_time_days: 0,
        processes: ['cnc_milling', 'cnc_turning', 'sheet_metal_laser'],
      },
    ];

    let filtered = finishes;

    if (filters?.process_type) {
      filtered = filtered.filter(f => f.processes.includes(filters.process_type));
    }

    // Basic material compatibility
    if (filters?.material_id?.startsWith('al')) {
      filtered = filtered.filter(f => 
        f.category === 'anodizing' || 
        f.category === 'coating' || 
        f.category === 'machined'
      );
    }

    return filtered;
  }

  /**
   * Get material by ID
   */
  async getMaterialById(id: string): Promise<MaterialCatalogItem | null> {
    const materials = await this.getMaterials();
    return materials.find(m => m.id === id) || null;
  }

  /**
   * Get finish by ID
   */
  async getFinishById(id: string): Promise<FinishCatalogItem | null> {
    const finishes = await this.getFinishes();
    return finishes.find(f => f.id === id) || null;
  }
}
