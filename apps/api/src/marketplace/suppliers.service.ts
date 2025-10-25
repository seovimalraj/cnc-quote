/**
 * Step 17: Suppliers Service
 * Business logic for supplier CRUD, validation, and capability management
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../legacy/audit/audit.service';
import type {
  SupplierProfile,
  CreateSupplierDto,
  UpdateSupplierDto,
  Capability,
  AttachFileDto,
  SupplierFile,
} from '@cnc-quote/shared/marketplace';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new supplier with optional capabilities
   */
  async create(
    orgId: string,
    userId: string,
    dto: CreateSupplierDto,
  ): Promise<SupplierProfile> {
    this.validateSupplierDto(dto);

    const client = this.supabase.getClient();

    // Insert supplier profile
    const { data: supplier, error } = await client
      .from('supplier_profiles')
      .insert({
        org_id: orgId,
        name: dto.name,
        regions: dto.regions,
        certifications: dto.certifications || ['NONE'],
        rating: dto.rating || 0,
        active: dto.active ?? true,
        notes: dto.notes,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create supplier: ${error.message}`);
    }

    // Insert capabilities if provided
    if (dto.capabilities && dto.capabilities.length > 0) {
      for (const cap of dto.capabilities) {
        await this.addCapability(orgId, supplier.id, cap);
      }
    }

    // Audit log
    await this.audit.log({
      action: 'SUPPLIER_CREATED',
      resourceType: 'supplier',
      resourceId: supplier.id,
      after: supplier,
      ctx: {
        orgId,
        userId,
      },
    });

    return this.mapToSupplierProfile(supplier);
  }

  /**
   * List suppliers with optional filters
   */
  async list(
    orgId: string,
    filters?: {
      active?: boolean;
      region?: string;
      process?: string;
    },
  ): Promise<SupplierProfile[]> {
    const client = this.supabase.getClient();

    let query = client
      .from('supplier_profiles')
      .select('*, process_capabilities(*)')
      .eq('org_id', orgId)
      .order('name');

    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    if (filters?.region) {
      query = query.contains('regions', [filters.region]);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to list suppliers: ${error.message}`);
    }

    let suppliers = data.map((s) => this.mapToSupplierProfile(s));

    // Filter by process if specified
    if (filters?.process) {
      suppliers = suppliers.filter((s) =>
        s.capabilities?.some((c) => c.process === filters.process),
      );
    }

    return suppliers;
  }

  /**
   * Get single supplier by ID
   */
  async findOne(orgId: string, supplierId: string): Promise<SupplierProfile> {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('supplier_profiles')
      .select('*, process_capabilities(*)')
      .eq('id', supplierId)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }

    return this.mapToSupplierProfile(data);
  }

  /**
   * Update supplier
   */
  async update(
    orgId: string,
    userId: string,
    supplierId: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierProfile> {
    const client = this.supabase.getClient();

    // Get existing supplier
    const existing = await this.findOne(orgId, supplierId);

    // Update
    const { data: updated, error } = await client
      .from('supplier_profiles')
      .update({
        name: dto.name ?? existing.name,
        regions: dto.regions ?? existing.regions,
        certifications: dto.certifications ?? existing.certifications,
        rating: dto.rating ?? existing.rating,
        active: dto.active ?? existing.active,
        notes: dto.notes ?? existing.notes,
      })
      .eq('id', supplierId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update supplier: ${error.message}`);
    }

    // Audit log
    await this.audit.log({
      action: 'SUPPLIER_UPDATED',
      resourceType: 'supplier',
      resourceId: supplierId,
      before: existing,
      after: updated,
      ctx: {
        orgId,
        userId,
      },
    });

    return this.mapToSupplierProfile(updated);
  }

  /**
   * Delete supplier
   */
  async delete(orgId: string, userId: string, supplierId: string): Promise<void> {
    const client = this.supabase.getClient();

    const existing = await this.findOne(orgId, supplierId);

    const { error } = await client
      .from('supplier_profiles')
      .delete()
      .eq('id', supplierId)
      .eq('org_id', orgId);

    if (error) {
      throw new BadRequestException(`Failed to delete supplier: ${error.message}`);
    }

    await this.audit.log({
      action: 'SUPPLIER_DELETED',
      resourceType: 'supplier',
      resourceId: supplierId,
      before: existing,
      ctx: {
        orgId,
        userId,
      },
    });
  }

  /**
   * Add capability to supplier
   */
  async addCapability(
    orgId: string,
    supplierId: string,
    capability: Omit<Capability, 'id'>,
  ): Promise<Capability> {
    // Verify supplier exists
    await this.findOne(orgId, supplierId);

    this.validateCapability(capability);

    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('process_capabilities')
      .insert({
        supplier_id: supplierId,
        process: capability.process,
        envelope_json: capability.envelope,
        materials_json: capability.materials,
        finish_json: capability.finishes || [],
        min_qty: capability.minQty || 1,
        max_qty: capability.maxQty || 1000000,
        leadtime_days_min: capability.leadtimeDaysMin || 3,
        leadtime_days_max: capability.leadtimeDaysMax || 30,
        unit_cost_index: capability.unitCostIndex || 1.0,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to add capability: ${error.message}`);
    }

    return this.mapToCapability(data);
  }

  /**
   * Attach file to supplier
   */
  async attachFile(
    orgId: string,
    userId: string,
    supplierId: string,
    dto: AttachFileDto,
  ): Promise<SupplierFile> {
    // Verify supplier exists
    await this.findOne(orgId, supplierId);

    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('supplier_files')
      .insert({
        supplier_id: supplierId,
        file_id: dto.fileId,
        kind: dto.kind,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to attach file: ${error.message}`);
    }

    await this.audit.log({
      action: 'SUPPLIER_FILE_ATTACHED',
      resourceType: 'supplier',
      resourceId: supplierId,
      after: data,
      ctx: {
        orgId,
        userId,
      },
    });

    return {
      id: data.id,
      supplierId: data.supplier_id,
      fileId: data.file_id,
      kind: data.kind,
      createdAt: data.created_at,
    };
  }

  /**
   * Validation helpers
   */
  private validateSupplierDto(dto: CreateSupplierDto): void {
    if (!dto.name || dto.name.length < 2 || dto.name.length > 200) {
      throw new BadRequestException('Supplier name must be 2-200 characters');
    }

    if (!dto.regions || dto.regions.length === 0) {
      throw new BadRequestException('At least one region is required');
    }

    if (dto.rating !== undefined && (dto.rating < 0 || dto.rating > 5)) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }
  }

  private validateCapability(cap: Omit<Capability, 'id'>): void {
    const env = cap.envelope;
    if (!env || env.maxX <= 0 || env.maxY <= 0 || env.maxZ <= 0) {
      throw new BadRequestException('Invalid envelope dimensions');
    }

    if (env.maxX > 10000 || env.maxY > 10000 || env.maxZ > 10000) {
      throw new BadRequestException('Envelope dimensions must be < 10000');
    }

    if (!cap.materials || cap.materials.length === 0) {
      throw new BadRequestException('At least one material is required');
    }

    if (cap.materials.length > 200) {
      throw new BadRequestException('Too many materials (max 200)');
    }

    if (cap.minQty && cap.maxQty && cap.minQty > cap.maxQty) {
      throw new BadRequestException('minQty cannot exceed maxQty');
    }

    if (
      cap.leadtimeDaysMin &&
      cap.leadtimeDaysMax &&
      cap.leadtimeDaysMin > cap.leadtimeDaysMax
    ) {
      throw new BadRequestException('leadtimeDaysMin cannot exceed leadtimeDaysMax');
    }

    if (cap.unitCostIndex && (cap.unitCostIndex < 0.2 || cap.unitCostIndex > 5.0)) {
      throw new BadRequestException('unitCostIndex must be between 0.2 and 5.0');
    }
  }

  /**
   * Mapping helpers
   */
  private mapToSupplierProfile(data: any): SupplierProfile {
    return {
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      regions: data.regions || [],
      certifications: data.certifications || ['NONE'],
      rating: parseFloat(data.rating) || 0,
      active: data.active,
      notes: data.notes,
      capabilities: data.process_capabilities?.map((c: any) => this.mapToCapability(c)),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToCapability(data: any): Capability {
    return {
      id: data.id,
      process: data.process,
      envelope: data.envelope_json,
      materials: data.materials_json,
      finishes: data.finish_json,
      minQty: data.min_qty,
      maxQty: data.max_qty,
      leadtimeDaysMin: data.leadtime_days_min,
      leadtimeDaysMax: data.leadtime_days_max,
      unitCostIndex: parseFloat(data.unit_cost_index) || 1.0,
    };
  }
}
