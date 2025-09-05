import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';

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
}
