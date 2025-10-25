/**
 * Step 14: Quote Outcomes Controller
 * REST endpoints for managing quote outcomes
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OutcomesService } from './outcomes.service';
import { SetOutcomeDto } from './dtos/outcome.dto';
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { RbacGuard } from "../../auth/rbac.middleware";

@ApiTags('Quote Outcomes')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  /**
   * Get outcome for a specific quote
   */
  @Get(':id/outcome')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({ summary: 'Get quote outcome' })
  @ApiResponse({ status: 200, description: 'Outcome found' })
  @ApiResponse({ status: 404, description: 'Outcome not found' })
  async getOutcome(
    @Param('id') quoteId: string,
    @Request() req: any,
  ) {
    const outcome = await this.outcomesService.getOutcome(
      quoteId,
      req.user.org_id,
    );

    if (!outcome) {
      return null; // Return null instead of 404 if no outcome set
    }

    return outcome;
  }

  /**
   * Set or update quote outcome
   */
  @Post(':id/outcome')
  @UseGuards(RbacGuard('quotes:update', 'quote'))
  @ApiOperation({ summary: 'Set or update quote outcome' })
  @ApiResponse({ status: 200, description: 'Outcome set successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - cannot modify accepted quote' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async setOutcome(
    @Param('id') quoteId: string,
    @Body() dto: SetOutcomeDto,
    @Request() req: any,
  ) {
    const isAdmin = req.user.roles?.includes('admin') || req.user.roles?.includes('super_admin');

    return this.outcomesService.setOutcome(
      quoteId,
      req.user.org_id,
      req.user.id,
      dto,
      isAdmin,
    );
  }

  /**
   * Delete quote outcome
   */
  @Delete(':id/outcome')
  @UseGuards(RbacGuard('quotes:update', 'quote'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear quote outcome' })
  @ApiResponse({ status: 204, description: 'Outcome cleared' })
  @ApiResponse({ status: 403, description: 'Forbidden - cannot clear accepted quote' })
  @ApiResponse({ status: 404, description: 'Outcome not found' })
  async deleteOutcome(
    @Param('id') quoteId: string,
    @Request() req: any,
  ) {
    const isAdmin = req.user.roles?.includes('admin') || req.user.roles?.includes('super_admin');

    await this.outcomesService.deleteOutcome(
      quoteId,
      req.user.org_id,
      req.user.id,
      isAdmin,
    );
  }

  /**
   * List outcomes with filtering
   */
  @Get('outcomes')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({ summary: 'List quote outcomes with filters' })
  @ApiResponse({ status: 200, description: 'Outcomes list' })
  async listOutcomes(
    @Query('status') status?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?: any,
  ) {
    return this.outcomesService.listOutcomes(req.user.org_id, {
      status,
      dateFrom,
      dateTo,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
