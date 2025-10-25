/**
 * Finishes Controller
 * API endpoints for finish operation management
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { FinishesService } from './finishes.service';
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RbacAuthGuard } from "../auth/rbac-auth.guard";
import { Policies } from "../auth/policies.decorator";
import { z } from 'zod';

// Validation schemas
const ValidateChainRequestSchema = z.object({
  steps: z.array(
    z.object({
      operation_code: z.string(),
  params: z.record(z.string(), z.any()).optional(),
    }),
  ),
});

const UpdateChainRequestSchema = z.object({
  steps: z.array(
    z.object({
      operation_code: z.string(),
  params: z.record(z.string(), z.any()).optional(),
    }),
  ),
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

type ValidateChainRequest = z.infer<typeof ValidateChainRequestSchema>;
type UpdateChainRequest = z.infer<typeof UpdateChainRequestSchema>;

@Controller('finishes')
@UseGuards(JwtAuthGuard, RbacAuthGuard)
export class FinishesController {
  private readonly logger = new Logger(FinishesController.name);

  constructor(private readonly finishesService: FinishesService) {}

  /**
   * GET /finishes
   * List all finish operations (optionally filtered by process)
   */
  @Get()
  @Policies({ action: 'view', resource: 'finishes' })
  async listOperations(
    @Query('process') process?: string,
    @Query('active') active?: string,
  ) {
    const filters: any = {};
    if (process) filters.process = process;
    if (active !== undefined) filters.active = active === 'true';

    const operations = await this.finishesService.listOperations(filters);
    return { operations };
  }

  /**
   * GET /finishes/:code
   * Get a single finish operation by code
   */
  @Get(':code')
  @Policies({ action: 'view', resource: 'finishes' })
  async getOperation(@Param('code') code: string) {
    const operation = await this.finishesService.getOperationByCode(code);
    if (!operation) {
      return { error: 'Operation not found', code: 'FINISH_OPERATION_NOT_FOUND' };
    }
    return { operation };
  }

  /**
   * POST /finishes/validate
   * Validate a finish chain (checks prerequisites, incompatibilities)
   */
  @Post('validate')
  @Policies({ action: 'view', resource: 'finishes' })
  async validateChain(@Body() body: ValidateChainRequest) {
    try {
      ValidateChainRequestSchema.parse(body);
    } catch (err: any) {
      return { valid: false, errors: [{ code: 'INVALID_REQUEST', message: err.message }] };
    }

    const result = await this.finishesService.validateChain(body.steps);
    return result;
  }

  /**
   * GET /quotes/:quoteId/lines/:lineId/finish-chain
   * Get finish chain for a quote line
   */
  @Get('quotes/:quoteId/lines/:lineId/finish-chain')
  @Policies({ action: 'view', resource: 'finishes' })
  async getChain(
    @Param('quoteId') _quoteId: string,
    @Param('lineId') lineId: string,
  ) {
    const chain = await this.finishesService.getChain(lineId);
    if (!chain) {
      return { chain: null, message: 'No finish chain found for this line' };
    }
    return { chain };
  }

  /**
   * PUT /quotes/:quoteId/lines/:lineId/finish-chain
   * Update finish chain for a quote line (validates, computes cost, persists)
   */
  @Put('quotes/:quoteId/lines/:lineId/finish-chain')
  @Policies({ action: 'manage', resource: 'finishes' })
  async updateChain(
    @Param('quoteId') _quoteId: string,
    @Param('lineId') lineId: string,
    @Body() body: UpdateChainRequest,
  ) {
    try {
      UpdateChainRequestSchema.parse(body);
    } catch (err: any) {
      return { error: 'Invalid request payload', code: 'INVALID_REQUEST', details: err.message };
    }

    try {
      const chain = await this.finishesService.updateChain(lineId, body.steps, body.context as any);
      return { chain };
    } catch (err: any) {
      this.logger.error(`Failed to update finish chain for line ${lineId}: ${err.message}`);
      return { error: err.message, code: 'FINISH_CHAIN_UPDATE_FAILED' };
    }
  }

  /**
   * DELETE /quotes/:quoteId/lines/:lineId/finish-chain
   * Delete finish chain for a quote line
   */
  @Delete('quotes/:quoteId/lines/:lineId/finish-chain')
  @Policies({ action: 'manage', resource: 'finishes' })
  async deleteChain(
    @Param('quoteId') _quoteId: string,
    @Param('lineId') lineId: string,
  ) {
    try {
      await this.finishesService.deleteChain(lineId);
      return { success: true, message: 'Finish chain deleted' };
    } catch (err: any) {
      this.logger.error(`Failed to delete finish chain for line ${lineId}: ${err.message}`);
      return { error: err.message, code: 'FINISH_CHAIN_DELETE_FAILED' };
    }
  }
}
