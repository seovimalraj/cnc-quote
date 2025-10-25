/**
 * Admin Finish Operations Controller
 * CRUD interface for managing finish operations (admin only)
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FinishesService } from '../finishes/finishes.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RbacAuthGuard } from '../auth/rbac-auth.guard';
import { Policies } from '../auth/policies.decorator';
import { FormulaEvaluator } from '../../common/formula/formula-evaluator';
import { z } from 'zod';

// Validation schemas
const CreateFinishOperationSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  process: z.string(),
  description: z.string().optional(),
  cost_formula: z.string().min(1).max(2000),
  lead_days_formula: z.string().min(1).max(2000),
  prerequisites_json: z.array(z.string()).default([]),
  incompatibilities_json: z.array(z.string()).default([]),
  qos_json: z
    .object({
      mode: z.enum(['add', 'max', 'serial']),
      parallel_compatible: z.boolean(),
      batch_discount_threshold: z.number().optional(),
    })
    .default({ mode: 'add', parallel_compatible: false }),
  active: z.boolean().default(true),
});

const UpdateFinishOperationSchema = CreateFinishOperationSchema.partial();

const TestFormulaRequestSchema = z.object({
  formula: z.string().min(1).max(2000),
  context: z.object({
    area_m2: z.number(),
    volume_cm3: z.number(),
    qty: z.number(),
    material: z.string(),
    region: z.string(),
    color: z.string().optional(),
    finish_grade: z.string().optional(),
    setup_minutes: z.number().optional(),
    run_minutes_per_part: z.number().optional(),
    batch_size: z.number().optional(),
  part_class: z.enum(['simple', 'complex', 'delicate']).optional(),
  }),
});

type CreateFinishOperationDto = z.infer<typeof CreateFinishOperationSchema>;
type UpdateFinishOperationDto = z.infer<typeof UpdateFinishOperationSchema>;
type TestFormulaRequest = z.infer<typeof TestFormulaRequestSchema>;

@Controller('admin/finish-operations')
@UseGuards(JwtAuthGuard, RbacAuthGuard)
export class AdminFinishOperationsController {
  private readonly logger = new Logger(AdminFinishOperationsController.name);

  constructor(
    private readonly finishesService: FinishesService,
    private readonly formulaEvaluator: FormulaEvaluator,
  ) {}

  /**
   * GET /admin/finish-operations
   * List all finish operations (admin view, includes inactive)
   */
  @Get()
  @Policies({ action: 'view', resource: 'finishes' })
  async listAll(@Query('process') process?: string) {
    const filters: any = {};
    if (process) filters.process = process;
    // Don't filter by active - show all for admin

    const operations = await this.finishesService.listOperations(filters);
    return { operations, count: operations.length };
  }

  /**
   * GET /admin/finish-operations/:id
   * Get single operation by ID
   */
  @Get(':id')
  @Policies({ action: 'view', resource: 'finishes' })
  async getById(@Param('id') id: string) {
    const { data, error } = await this.finishesService['supabase'].client
      .from('finish_operations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch operation ${id}: ${error.message}`);
      return { error: 'Operation not found', code: 'OPERATION_NOT_FOUND' };
    }

    return { operation: data };
  }

  /**
   * POST /admin/finish-operations
   * Create new finish operation
   */
      @Post('evaluate')
  @Policies({ action: 'view', resource: 'finishes' })
  async evaluate(@Body() body: any) {
    try {
      CreateFinishOperationSchema.parse(body);
    } catch (err: any) {
      return { error: 'Invalid request payload', code: 'INVALID_REQUEST', details: err.message };
    }

    // Validate formulas before saving
    try {
      const testContext = {
        area_m2: 0.1,
        sa: 0.1,
        volume_cm3: 100,
        v_cm3: 100,
        qty: 1,
        material: 'AL6061',
        region: 'US',
      };
      await this.formulaEvaluator.evaluate(body.cost_formula, testContext);
      await this.formulaEvaluator.evaluate(body.lead_days_formula, testContext);
    } catch (err) {
      return {
        error: 'Formula validation failed',
        code: 'INVALID_FORMULA',
        details: err instanceof Error ? err.message : String(err),
      };
    }

    try {
      const { data, error } = await this.finishesService['supabase'].client
        .from('finish_operations')
        .insert(body)
        .select()
        .single();

      if (error) throw error;

      this.logger.log(`Created finish operation: ${body.code}`);
      return { operation: data };
    } catch (err: any) {
      this.logger.error(`Failed to create finish operation: ${err.message}`);
      return { error: err.message, code: 'CREATE_FAILED' };
    }
  }

  /**
   * PUT /admin/finish-operations/:id
   * Update finish operation
   */
    @Put(':id')
  @Policies({ action: 'update', resource: 'finishes' })
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      UpdateFinishOperationSchema.parse(body);
    } catch (err: any) {
      return { error: 'Invalid request payload', code: 'INVALID_REQUEST', details: err.message };
    }

    // Validate formulas if provided
    if (body.cost_formula || body.lead_days_formula) {
      try {
        const testContext = {
          area_m2: 0.1,
          sa: 0.1,
          volume_cm3: 100,
          v_cm3: 100,
          qty: 1,
          material: 'AL6061',
          region: 'US',
        };
        if (body.cost_formula) {
          await this.formulaEvaluator.evaluate(body.cost_formula, testContext);
        }
        if (body.lead_days_formula) {
          await this.formulaEvaluator.evaluate(body.lead_days_formula, testContext);
        }
      } catch (err) {
        return {
          error: 'Formula validation failed',
          code: 'INVALID_FORMULA',
          details: err instanceof Error ? err.message : String(err),
        };
      }
    }

    try {
      // Increment version if formula changed
      const updateData: any = { ...body };
      if (body.cost_formula || body.lead_days_formula) {
        const { data: current } = await this.finishesService['supabase'].client
          .from('finish_operations')
          .select('version')
          .eq('id', id)
          .single();
        if (current) {
          updateData.version = (current.version || 1) + 1;
        }
      }

      const { data, error } = await this.finishesService['supabase'].client
        .from('finish_operations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      this.logger.log(`Updated finish operation: ${id}`);
      return { operation: data };
    } catch (err: any) {
      this.logger.error(`Failed to update finish operation ${id}: ${err.message}`);
      return { error: err.message, code: 'UPDATE_FAILED' };
    }
  }

  /**
   * DELETE /admin/finish-operations/:id
   * Delete finish operation (soft delete via active flag)
   */
  @Delete(':id')
  @Policies({ action: 'delete', resource: 'finishes' })
  async delete(@Param('id') id: string) {
    try {
      const { error } = await this.finishesService['supabase'].client
        .from('finish_operations')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      this.logger.log(`Deactivated finish operation: ${id}`);
      return { success: true, message: 'Operation deactivated' };
    } catch (err: any) {
      this.logger.error(`Failed to delete finish operation ${id}: ${err.message}`);
      return { error: err.message, code: 'DELETE_FAILED' };
    }
  }

  /**
   * POST /admin/finish-operations/test-formula
   * Test formula evaluation with context
   */
  @Post('test-formula')
  @Policies({ action: 'view', resource: 'finishes' })
  async testFormula(@Body() body: TestFormulaRequest) {
    try {
      TestFormulaRequestSchema.parse(body);
    } catch (err: any) {
      return { error: 'Invalid request payload', code: 'INVALID_REQUEST', details: err.message };
    }

    try {
      const context = {
        ...body.context,
        sa: body.context.area_m2,
        v_cm3: body.context.volume_cm3,
      };

      const result = await this.formulaEvaluator.evaluate(body.formula, context);

      return {
        success: true,
        result,
        context,
        formula: body.formula,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        context: body.context,
        formula: body.formula,
      };
    }
  }
}
