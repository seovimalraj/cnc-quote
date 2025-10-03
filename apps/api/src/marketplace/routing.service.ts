/**
 * Step 17: Routing Service
 * Manual routing engine with filter→score algorithm
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import type {
  GetCandidatesDto,
  CandidatesResponse,
  CandidateScore,
  AssignSupplierDto,
  AssignSupplierResponse,
  RuleAst,
  Comparison,
  SupplierProfile,
  Capability,
  RoutingRule,
  CreateRoutingRuleDto,
} from '@cnc-quote/shared/marketplace';

@Injectable()
export class RoutingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Get ranked candidate list for an order
   */
  async getCandidates(
    orgId: string,
    dto: GetCandidatesDto,
  ): Promise<CandidatesResponse> {
    const client = this.supabase.getClient();

    // 1. Fetch all active suppliers with capabilities
    const { data: suppliers, error } = await client
      .from('supplier_profiles')
      .select('*, process_capabilities(*)')
      .eq('org_id', orgId)
      .eq('active', true);

    if (error) {
      throw new BadRequestException(`Failed to fetch suppliers: ${error.message}`);
    }

    // 2. Fetch routing rules
    const { data: rules } = await client
      .from('routing_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('priority', { ascending: true });

    const candidates: CandidateScore[] = [];
    let totalEvaluated = 0;

    // 3. Evaluate each supplier
    for (const supplier of suppliers) {
      totalEvaluated++;

      const supplierProfile = this.mapToSupplierProfile(supplier);
      const matchingCapabilities = supplierProfile.capabilities?.filter(
        (cap) => cap.process === dto.process,
      );

      if (!matchingCapabilities || matchingCapabilities.length === 0) {
        continue; // No matching process
      }

      for (const capability of matchingCapabilities) {
        const evaluation = this.evaluateCandidate(
          supplierProfile,
          capability,
          dto,
          rules || [],
        );

        if (evaluation.hardBlocks.length === 0) {
          candidates.push(evaluation);
        }
      }
    }

    // 4. Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return {
      candidates,
      orderId: dto.orderId,
      totalEvaluated,
      matchCount: candidates.length,
    };
  }

  /**
   * Evaluate a single supplier+capability against requirements
   */
  private evaluateCandidate(
    supplier: SupplierProfile,
    capability: Capability,
    req: GetCandidatesDto,
    rules: any[],
  ): CandidateScore {
    const hardBlocks: string[] = [];
    const softPenalties: string[] = [];
    const reasons: string[] = [];
    let score = 0.5; // Base score

    // HARD FILTERS

    // 1. Material check
    if (!capability.materials.includes(req.material)) {
      hardBlocks.push(`Material ${req.material} not supported`);
    } else {
      reasons.push('Material supported');
    }

    // 2. Envelope check
    if (req.geometry?.bbox) {
      const bbox = req.geometry.bbox;
      const env = capability.envelope;

      if (bbox.x > env.maxX || bbox.y > env.maxY || bbox.z > env.maxZ) {
        hardBlocks.push('Part exceeds machine envelope');
      } else {
        reasons.push('Envelope OK');
      }
    }

    // 3. Quantity check
    if (
      req.quantity < (capability.minQty || 1) ||
      req.quantity > (capability.maxQty || 1000000)
    ) {
      hardBlocks.push(`Quantity ${req.quantity} outside range [${capability.minQty}, ${capability.maxQty}]`);
    } else {
      reasons.push('Quantity in range');
    }

    // 4. ITAR check
    if (req.flags?.includes('ITAR')) {
      if (!supplier.certifications.includes('ITAR')) {
        hardBlocks.push('Requires ITAR certification');
      } else {
        reasons.push('ITAR certified');
      }
    }

    // 5. Rule evaluation
    for (const rule of rules) {
      const ruleAst: RuleAst = rule.rule_json;
      const context = { order: req, supplier, capability };

      if (!this.evaluateRule(ruleAst, context)) {
        hardBlocks.push(`Rule violation: ${rule.name}`);
      }
    }

    // If hard blocks exist, return early
    if (hardBlocks.length > 0) {
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        score: 0,
        reasons: [],
        hardBlocks,
        softPenalties: [],
        capability,
      };
    }

    // SCORING

    // Region match
    if (req.region && supplier.regions.includes(req.region)) {
      score += 0.15;
      reasons.push('Region match');
    }

    // Finish support
    if (req.finishes && req.finishes.length > 0) {
      const supportedFinishes = capability.finishes || [];
      const allSupported = req.finishes.every((f) => supportedFinishes.includes(f));
      if (allSupported) {
        score += 0.05;
        reasons.push('All finishes supported');
      }
    }

    // Lead time bonus
    const leadtimeMin = capability.leadtimeDaysMin || 3;
    if (leadtimeMin <= 5) {
      score += 0.1;
      reasons.push('Fast lead time');
    }

    // Rating bonus
    score += 0.05 * supplier.rating;
    reasons.push(`Rating: ${supplier.rating.toFixed(1)}`);

    // Tolerance check (soft penalty)
    if (req.tolerances?.general) {
      const capTolerance = capability.envelope.tolerances?.general;
      if (capTolerance && req.tolerances.general < capTolerance) {
        score -= 0.1;
        softPenalties.push('Tolerance tighter than capability');
      }
    }

    // Thread support check
    if (req.geometry?.threads && !capability.envelope.threadSupport) {
      score -= 0.05;
      softPenalties.push('Thread support uncertain');
    }

    // Cost index factor
    const costIndex = capability.unitCostIndex || 1.0;
    if (costIndex < 1.0) {
      score += 0.05;
      reasons.push('Cost-competitive');
    }

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      score: Math.max(0, Math.min(1, score)),
      reasons,
      hardBlocks,
      softPenalties,
      capability,
    };
  }

  /**
   * Evaluate a routing rule AST
   */
  private evaluateRule(ast: RuleAst, context: any): boolean {
    if (ast.all) {
      return ast.all.every((child) => this.evaluateRule(child, context));
    }

    if (ast.any) {
      return ast.any.some((child) => this.evaluateRule(child, context));
    }

    if (ast.not) {
      return !this.evaluateRule(ast.not, context);
    }

    if (ast.expr) {
      return this.evaluateComparison(ast.expr, context);
    }

    return true;
  }

  /**
   * Evaluate a comparison expression
   */
  private evaluateComparison(expr: Comparison, context: any): boolean {
    const value = this.getValueByPath(expr.field, context);

    switch (expr.op) {
      case 'EQ':
        return value === expr.value;
      case 'NEQ':
        return value !== expr.value;
      case 'IN':
        return Array.isArray(expr.value) && expr.value.includes(value);
      case 'NIN':
        return Array.isArray(expr.value) && !expr.value.includes(value);
      case 'GTE':
        return value >= expr.value;
      case 'LTE':
        return value <= expr.value;
      case 'GT':
        return value > expr.value;
      case 'LT':
        return value < expr.value;
      case 'HAS_ALL':
        return (
          Array.isArray(value) &&
          Array.isArray(expr.value) &&
          expr.value.every((v: any) => value.includes(v))
        );
      case 'HAS_ANY':
        return (
          Array.isArray(value) &&
          Array.isArray(expr.value) &&
          expr.value.some((v: any) => value.includes(v))
        );
      case 'CONTAINS':
        if (Array.isArray(value)) {
          return value.includes(expr.value);
        }
        if (typeof value === 'string') {
          return value.includes(expr.value);
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Get value by dot-notation path
   */
  private getValueByPath(path: string, obj: any): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Assign supplier to order
   */
  async assignSupplier(
    orgId: string,
    userId: string,
    orderId: string,
    dto: AssignSupplierDto,
  ): Promise<AssignSupplierResponse> {
    const client = this.supabase.getClient();

    // 1. Verify order exists and isn't already assigned
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('*, supplier_profiles(name)')
      .eq('id', orderId)
      .eq('org_id', orgId)
      .single();

    if (orderError || !order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.supplier_id) {
      throw new ConflictException('Order already assigned to a supplier');
    }

    // 2. Verify supplier exists
    const { data: supplier, error: supplierError } = await client
      .from('supplier_profiles')
      .select('name')
      .eq('id', dto.supplierId)
      .eq('org_id', orgId)
      .single();

    if (supplierError || !supplier) {
      throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
    }

    // 3. Assign supplier
    const routedAt = new Date().toISOString();

    const { error: updateError } = await client
      .from('orders')
      .update({
        supplier_id: dto.supplierId,
        routing_notes: dto.note,
        routed_at: routedAt,
        routed_by: userId,
      })
      .eq('id', orderId)
      .eq('org_id', orgId);

    if (updateError) {
      throw new BadRequestException(`Failed to assign supplier: ${updateError.message}`);
    }

    // 4. Audit log
    await this.audit.log({
      action: 'ORDER_ROUTED',
      resourceType: 'order',
      resourceId: orderId,
      after: {
        supplier_id: dto.supplierId,
        routing_notes: dto.note,
        routed_at: routedAt,
      },
      ctx: {
        orgId,
        userId,
      },
    });

    // 5. Emit websocket event
    this.events.emit('orders', 'ORDER_ROUTED', {
      orderId,
      supplierId: dto.supplierId,
      supplierName: supplier.name,
      routedBy: userId,
      routedAt,
    });

    return {
      status: 'ok',
      orderId,
      supplierId: dto.supplierId,
      routedAt,
      routedBy: userId,
    };
  }

  /**
   * Create routing rule
   */
  async createRule(
    orgId: string,
    userId: string,
    dto: CreateRoutingRuleDto,
  ): Promise<RoutingRule> {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('routing_rules')
      .insert({
        org_id: orgId,
        name: dto.name,
        priority: dto.priority || 100,
        rule_json: dto.rule,
        active: dto.active ?? true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create rule: ${error.message}`);
    }

    await this.audit.log({
      action: 'ROUTING_RULE_CREATED',
      resourceType: 'routing_rule',
      resourceId: data.id,
      after: data,
      ctx: {
        orgId,
        userId,
      },
    });

    return {
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      priority: data.priority,
      active: data.active,
      rule: data.rule_json,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Helper: Map database row to SupplierProfile
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
      capabilities: data.process_capabilities?.map((c: any) => ({
        id: c.id,
        process: c.process,
        envelope: c.envelope_json,
        materials: c.materials_json,
        finishes: c.finish_json,
        minQty: c.min_qty,
        maxQty: c.max_qty,
        leadtimeDaysMin: c.leadtime_days_min,
        leadtimeDaysMax: c.leadtime_days_max,
        unitCostIndex: parseFloat(c.unit_cost_index) || 1.0,
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
