/**
 * Finishes Service
 * Manages finish operation chains with validation, cost/lead calculations
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { FormulaEvaluator } from "../../../lib/common/formula/formula-evaluator";
import {
  FinishOperation,
  ChainStep,
  FinishChain,
  ChainValidationResult,
  ChainValidationError,
  FormulaContext,
  ChainCostBreakdown,
} from './finishes.types';
import { ContractsV1 } from '@cnc-quote/shared';

@Injectable()
export class FinishesService {
  private readonly logger = new Logger(FinishesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly formulaEvaluator: FormulaEvaluator,
  ) {}

  /**
   * List all finish operations, optionally filtered by process and active status
   */
  async listOperations(filters?: {
    process?: ContractsV1.ProcessType;
    active?: boolean;
  }): Promise<FinishOperation[]> {
    let query = this.supabase.client
      .from('finish_operations')
      .select('*')
      .order('name', { ascending: true });

    if (filters?.process) {
      query = query.eq('process', filters.process);
    }
    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error(`Failed to list finish operations: ${error.message}`);
      throw error;
    }
    return data || [];
  }

  /**
   * Get a single finish operation by code
   */
  async getOperationByCode(code: string): Promise<FinishOperation | null> {
    const { data, error } = await this.supabase.client
      .from('finish_operations')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to get finish operation ${code}: ${error.message}`);
      throw error;
    }
    return data;
  }

  /**
   * Get finish chain for a quote line
   */
  async getChain(quoteLineId: string): Promise<FinishChain | null> {
    const { data: chainRows, error } = await this.supabase.client
      .from('quote_line_finish_chain')
      .select(`
        *,
        operation:finish_operations(*)
      `)
      .eq('quote_line_id', quoteLineId)
      .order('sequence', { ascending: true });

    if (error) {
      this.logger.error(`Failed to get finish chain for line ${quoteLineId}: ${error.message}`);
      throw error;
    }

    if (!chainRows || chainRows.length === 0) {
      return null;
    }

    const steps: ChainStep[] = chainRows.map((row: any) => ({
      operation_id: row.operation_id,
      operation_code: row.operation.code,
      operation_name: row.operation.name,
      sequence: row.sequence,
      params: row.params_json || {},
      cost_cents: row.cost_cents,
      lead_days: row.lead_days,
      notes: row.notes,
    }));

    const total_cost_cents = steps.reduce((sum, s) => sum + (s.cost_cents || 0), 0);
    const added_lead_days = Math.max(...steps.map(s => s.lead_days || 0), 0);

    return {
      quote_line_id: quoteLineId,
      steps,
      total_cost_cents,
      added_lead_days,
    };
  }

  /**
   * Validate a finish chain (checks prerequisites, incompatibilities, circular deps)
   */
  async validateChain(
    steps: Array<{ operation_code: string; params?: Record<string, any> }>,
  ): Promise<ChainValidationResult> {
    const errors: ChainValidationError[] = [];

    // 1. Fetch all operations
    const codes = steps.map(s => s.operation_code);
    const { data: operations, error: fetchErr } = await this.supabase.client
      .from('finish_operations')
      .select('*')
      .in('code', codes);

    if (fetchErr) {
      this.logger.error(`Failed to fetch operations for validation: ${fetchErr.message}`);
      throw fetchErr;
    }

    const opsMap = new Map<string, FinishOperation>();
    (operations || []).forEach((op: FinishOperation) => {
      opsMap.set(op.code, op);
    });

    // 2. Check all operations exist and are active
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const op = opsMap.get(step.operation_code);
      if (!op) {
        errors.push({
          code: 'FINISH_OPERATION_NOT_FOUND',
          message: `Operation "${step.operation_code}" not found`,
          operation_code: step.operation_code,
          sequence: i + 1,
        });
        continue;
      }
      if (!op.active) {
        errors.push({
          code: 'FINISH_OPERATION_INACTIVE',
          message: `Operation "${step.operation_code}" is inactive`,
          operation_code: step.operation_code,
          sequence: i + 1,
        });
      }
    }

    // If any operations missing/inactive, stop here
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // 3. Build precedence map (which operations appear before each step)
    const precedenceMap = new Map<number, Set<string>>();
    for (let i = 0; i < steps.length; i++) {
      const preceding = new Set<string>();
      for (let j = 0; j < i; j++) {
        preceding.add(steps[j].operation_code);
      }
      precedenceMap.set(i, preceding);
    }

    // 4. Check prerequisites
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const op = opsMap.get(step.operation_code)!;
      const preceding = precedenceMap.get(i)!;

      for (const prereq of op.prerequisites_json || []) {
        if (!preceding.has(prereq)) {
          errors.push({
            code: 'FINISH_PREREQ_MISSING',
            message: `Operation "${step.operation_code}" requires "${prereq}" to appear earlier in the chain`,
            operation_code: step.operation_code,
            sequence: i + 1,
            details: { missing_prerequisite: prereq },
          });
        }
      }
    }

    // 5. Check incompatibilities (any operation conflicts with another in the chain)
    const allCodes = new Set(steps.map(s => s.operation_code));
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const op = opsMap.get(step.operation_code)!;

      for (const incompatible of op.incompatibilities_json || []) {
        if (allCodes.has(incompatible)) {
          errors.push({
            code: 'FINISH_INCOMPATIBLE',
            message: `Operation "${step.operation_code}" is incompatible with "${incompatible}" in the same chain`,
            operation_code: step.operation_code,
            sequence: i + 1,
            details: { incompatible_operation: incompatible },
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compute cost/lead breakdown for a finish chain
   */
  async computeChainCost(
    steps: Array<{ operation_code: string; params?: Record<string, any> }>,
    context: FormulaContext,
  ): Promise<ChainCostBreakdown> {
    // Fetch operations
    const codes = steps.map(s => s.operation_code);
    const { data: operations, error: fetchErr } = await this.supabase.client
      .from('finish_operations')
      .select('*')
      .in('code', codes);

    if (fetchErr) {
      this.logger.error(`Failed to fetch operations for cost computation: ${fetchErr.message}`);
      throw fetchErr;
    }

    const opsMap = new Map<string, FinishOperation>();
    (operations || []).forEach((op: FinishOperation) => {
      opsMap.set(op.code, op);
    });

    const breakdown: ChainCostBreakdown['steps'] = [];
    let totalCostCents = 0;
    let addedLeadDays = 0;
    let computationMode: 'add' | 'max' | 'serial' = 'add';

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const op = opsMap.get(step.operation_code);
      if (!op) {
        this.logger.warn(`Operation ${step.operation_code} not found, skipping cost computation`);
        continue;
      }

      // Merge params into context
      const evalContext = { ...context, ...(step.params || {}) };

      // Evaluate cost formula
      let costCents = 0;
      try {
  const costResult = await this.formulaEvaluator.evaluate(op.cost_formula, evalContext as any);
        costCents = Math.round(costResult);
      } catch (err) {
        this.logger.error(
          `Failed to evaluate cost formula for ${op.code}: ${err instanceof Error ? err.message : err}`,
        );
        throw new Error(`FINISH_UNSAFE_FORMULA: ${op.code} cost formula failed`);
      }

      // Evaluate lead days formula
      let leadDays = 0;
      try {
  const leadResult = await this.formulaEvaluator.evaluate(op.lead_days_formula, evalContext as any);
        leadDays = Math.ceil(leadResult);
      } catch (err) {
        this.logger.error(
          `Failed to evaluate lead formula for ${op.code}: ${err instanceof Error ? err.message : err}`,
        );
        throw new Error(`FINISH_UNSAFE_FORMULA: ${op.code} lead formula failed`);
      }

      breakdown.push({
        code: op.code,
        name: op.name,
        sequence: i + 1,
        cost_cents: costCents,
        lead_days: leadDays,
        params: step.params || {},
      });

      // Accumulate cost (always add)
      totalCostCents += costCents;

      // Accumulate lead time based on qos.mode
      const qosMode = op.qos_json?.mode || 'add';
      if (qosMode === 'add' || qosMode === 'serial') {
        addedLeadDays += leadDays;
      } else if (qosMode === 'max') {
        addedLeadDays = Math.max(addedLeadDays, leadDays);
      }

      // Use first non-'add' mode found for reporting
      if (computationMode === 'add' && qosMode !== 'add') {
        computationMode = qosMode;
      }
    }

    return {
      steps: breakdown,
      total_cost_cents: totalCostCents,
      added_lead_days: addedLeadDays,
      computation_mode: computationMode,
    };
  }

  /**
   * Update finish chain for a quote line (validates, computes cost, persists)
   */
  async updateChain(
    quoteLineId: string,
    steps: Array<{ operation_code: string; params?: Record<string, any> }>,
    context: FormulaContext,
  ): Promise<FinishChain> {
    // 1. Validate chain
    const validation = await this.validateChain(steps);
    if (!validation.valid) {
      const errorMsg = validation.errors.map(e => `${e.code}: ${e.message}`).join('; ');
      throw new Error(`Chain validation failed: ${errorMsg}`);
    }

    // 2. Compute cost/lead breakdown
    const breakdown = await this.computeChainCost(steps, context);

    // 3. Fetch operation IDs
    const codes = steps.map(s => s.operation_code);
    const { data: operations, error: fetchErr } = await this.supabase.client
      .from('finish_operations')
      .select('id, code')
      .in('code', codes);

    if (fetchErr) {
      this.logger.error(`Failed to fetch operation IDs: ${fetchErr.message}`);
      throw fetchErr;
    }

    const codeToIdMap = new Map<string, string>();
    (operations || []).forEach((op: any) => {
      codeToIdMap.set(op.code, op.id);
    });

    // 4. Delete existing chain for this line
    const { error: deleteErr } = await this.supabase.client
      .from('quote_line_finish_chain')
      .delete()
      .eq('quote_line_id', quoteLineId);

    if (deleteErr) {
      this.logger.error(`Failed to delete old chain for line ${quoteLineId}: ${deleteErr.message}`);
      throw deleteErr;
    }

    // 5. Insert new chain rows
    const now = new Date().toISOString();
    const insertRows = breakdown.steps.map((step, idx) => ({
      quote_line_id: quoteLineId,
      operation_id: codeToIdMap.get(step.code)!,
      sequence: step.sequence,
      params_json: step.params,
      cost_cents: step.cost_cents,
      lead_days: step.lead_days,
      notes: null,
      created_at: now,
      updated_at: now,
    }));

    if (insertRows.length > 0) {
      const { error: insertErr } = await this.supabase.client
        .from('quote_line_finish_chain')
        .insert(insertRows);

      if (insertErr) {
        this.logger.error(`Failed to insert new chain for line ${quoteLineId}: ${insertErr.message}`);
        throw insertErr;
      }
    }

    // 6. Return finalized chain
    const chainSteps: ChainStep[] = breakdown.steps.map(s => ({
      operation_id: codeToIdMap.get(s.code)!,
      operation_code: s.code,
      operation_name: s.name,
      sequence: s.sequence,
      params: s.params,
      cost_cents: s.cost_cents,
      lead_days: s.lead_days,
    }));

    return {
      quote_line_id: quoteLineId,
      steps: chainSteps,
      total_cost_cents: breakdown.total_cost_cents,
      added_lead_days: breakdown.added_lead_days,
    };
  }

  /**
   * Delete finish chain for a quote line
   */
  async deleteChain(quoteLineId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('quote_line_finish_chain')
      .delete()
      .eq('quote_line_id', quoteLineId);

    if (error) {
      this.logger.error(`Failed to delete chain for line ${quoteLineId}: ${error.message}`);
      throw error;
    }
  }
}
