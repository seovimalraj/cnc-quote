/**
 * Step 15: Quote Revisions Controller
 * API endpoints for quote expiration and repricing
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { OrgGuard } from '../../auth/org.guard';
import { RbacGuard } from '../../auth/rbac.middleware';
import { QuoteRevisionsService } from './revisions.service';
import {
  ExtendExpirationDto,
  ExtendExpirationResponse,
  RepriceDto,
  RepriceResponse,
  QuoteRevisionDto,
} from './dtos/revisions.dto';
import { PricingBreakdown } from './entities/revision.entity';

@ApiTags('Quote Revisions & Expiration')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard, OrgGuard)
export class QuoteRevisionsController {
  private readonly logger = new Logger(QuoteRevisionsController.name);

  constructor(private readonly revisionsService: QuoteRevisionsService) {}

  /**
   * Get all revisions for a quote
   */
  @Get(':id/revisions')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({ summary: 'Get quote revision history' })
  @ApiResponse({ status: 200, description: 'Revisions retrieved' })
  async getRevisions(
    @Param('id') quoteId: string,
    @Request() req: any,
  ): Promise<QuoteRevisionDto[]> {
    const revisions = await this.revisionsService.getRevisions(quoteId, req.rbac.orgId);
    return revisions.map(r => ({
      id: r.id,
      quote_id: r.quote_id,
      user_id: r.user_id,
      created_at: r.created_at,
      diff: r.diff_json,
      note: r.note,
      restore_of_revision_id: r.restore_of_revision_id,
      total_delta: r.total_delta,
      pct_delta: r.pct_delta,
    }));
  }

  /**
   * Get a specific revision
   */
  @Get('revisions/:revisionId')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({ summary: 'Get a specific revision' })
  @ApiResponse({ status: 200, description: 'Revision retrieved' })
  async getRevision(
    @Param('revisionId') revisionId: string,
    @Request() req: any,
  ): Promise<QuoteRevisionDto> {
    const revision = await this.revisionsService.getRevision(revisionId, req.rbac.orgId);
    return {
      id: revision.id,
      quote_id: revision.quote_id,
      user_id: revision.user_id,
      created_at: revision.created_at,
      diff: revision.diff_json,
      note: revision.note,
      restore_of_revision_id: revision.restore_of_revision_id,
      total_delta: revision.total_delta,
      pct_delta: revision.pct_delta,
    };
  }

  /**
   * Extend quote expiration
   */
  @Patch(':id/extend-expiration')
  @UseGuards(RbacGuard('quotes:update', 'quote'))
  @ApiOperation({ summary: 'Extend quote expiration by N days' })
  @ApiResponse({ status: 200, description: 'Expiration extended', type: ExtendExpirationResponse })
  @ApiResponse({ status: 403, description: 'Forbidden - missing policy' })
  @ApiResponse({ status: 409, description: 'Cannot extend expired quote' })
  async extendExpiration(
    @Param('id') quoteId: string,
    @Body() dto: ExtendExpirationDto,
    @Request() req: any,
  ): Promise<ExtendExpirationResponse> {
    // Check if user has extend_after_expiry policy (would need RBAC enhancement)
    const allowAfterExpiry = false; // TODO: Check policy

    const result = await this.revisionsService.extendExpiration(
      quoteId,
      req.rbac.orgId,
      req.user.sub,
      dto.days,
      allowAfterExpiry,
    );

    this.logger.log(
      `User ${req.user.sub} extended quote ${quoteId} expiration by ${dto.days} days`
    );

    return {
      quote_id: quoteId,
      old_expires_at: result.old_expires_at,
      new_expires_at: result.new_expires_at,
      extended_by_days: dto.days,
    };
  }

  /**
   * Reprice a quote
   * Generates pricing diff and optionally creates revision
   */
  @Post(':id/reprice')
  @UseGuards(RbacGuard('quotes:update', 'quote'))
  @ApiOperation({ summary: 'Reprice quote with current pricing catalog' })
  @ApiResponse({ status: 200, description: 'Repriced successfully', type: RepriceResponse })
  @ApiResponse({ status: 409, description: 'Quote not eligible for repricing' })
  async repriceQuote(
    @Param('id') quoteId: string,
    @Body() dto: RepriceDto,
    @Request() req: any,
  ): Promise<RepriceResponse> {
    // TODO: Implement full reprice flow
    // 1. Load current quote and pricing breakdown
    // 2. Re-run pricing engine with current catalog
    // 3. Generate diff
    // 4. If not dry run, create revision and update quote
    
    // For now, throw not implemented
    throw new ConflictException(
      'Reprice endpoint implementation pending - requires pricing engine integration'
    );

    // Placeholder return
    // const diff = await this.generateRepriceDiff(quoteId, dto.strategy);
    // let revisionId = null;
    // 
    // if (!dto.dryRun) {
    //   const revision = await this.revisionsService.createRevision(...);
    //   revisionId = revision.id;
    //   await this.revisionsService.restoreToActive(...);
    // }
    //
    // return {
    //   diff,
    //   revision_id: revisionId,
    //   repriced_at: new Date(),
    //   status: dto.dryRun ? 'expired' : 'active',
    //   version: quote.version + (dto.dryRun ? 0 : 1),
    // };
  }
}
