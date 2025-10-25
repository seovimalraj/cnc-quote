/**
 * Step 16: Revisions Controller
 * REST API for revision timeline, comparison, and restore
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RevisionsService } from './revisions.service';
import { RestoreGuard } from './restore.guard';
// RbacGuard import - adjust path as needed - commented out for now
// import { RbacGuard } from "../core/auth/rbac.guard";

interface CompareRevisionsDto {
  a: string;
  b: string;
}

interface RestoreRevisionDto {
  note?: string;
}

interface UpdateNoteDto {
  note: string;
}

@Controller('quotes/:quoteId/revisions')
// @UseGuards(RbacGuard) // Commented out - enable when RbacGuard is available
export class RevisionsController {
  constructor(private readonly revisionsService: RevisionsService) {}

  /**
   * GET /quotes/:quoteId/revisions
   * List all revisions for a quote
   */
  @Get()
  async listRevisions(
    @Param('quoteId') quoteId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const orgId = req.user?.org_id;
    
    return this.revisionsService.listRevisions(quoteId, orgId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /quotes/:quoteId/revisions/:revisionId
   * Get a specific revision
   */
  @Get(':revisionId')
  async getRevision(
    @Param('quoteId') quoteId: string,
    @Param('revisionId') revisionId: string,
    @Req() req?: any,
  ) {
    const orgId = req.user?.org_id;
    const revision = await this.revisionsService.getRevision(revisionId, orgId);
    
    // Verify revision belongs to the requested quote
    if (revision.quote_id !== quoteId) {
      throw new Error('Revision does not belong to this quote');
    }
    
    return revision;
  }

  /**
   * POST /quotes/:quoteId/revisions/compare
   * Compare two revisions
   */
  @Post('compare')
  @HttpCode(HttpStatus.OK)
  async compareRevisions(
    @Param('quoteId') quoteId: string,
    @Body() body: CompareRevisionsDto,
    @Req() req?: any,
  ) {
    const orgId = req.user?.org_id;
    
    const result = await this.revisionsService.compareRevisions(
      body.a,
      body.b,
      orgId,
    );

    // Audit log for compare view
    // await this.audit.log({ action: 'REVISION_COMPARE_VIEWED', ... });

    return result;
  }

  /**
   * POST /quotes/:quoteId/revisions/:revisionId/restore
   * Restore a revision (policy-gated)
   */
  @Post(':revisionId/restore')
  @UseGuards(RestoreGuard)
  @HttpCode(HttpStatus.OK)
  async restoreRevision(
    @Param('quoteId') quoteId: string,
    @Param('revisionId') revisionId: string,
    @Body() body: RestoreRevisionDto,
    @Req() req?: any,
  ) {
    const orgId = req.user?.org_id;
    const userId = req.user?.id;
    
    return this.revisionsService.restoreRevision(
      revisionId,
      orgId,
      userId,
    );
  }

  /**
   * POST /quotes/:quoteId/revisions/:revisionId/note
   * Add or update note on a revision
   */
    @Post(':revisionId/note')
  @HttpCode(HttpStatus.OK)
  async updateNote(
    @Param('quoteId') quoteId: string,
    @Param('revisionId') revisionId: string,
    @Body() body: UpdateNoteDto,
    @Req() req?: any,
  ) {
    const orgId = req.user?.org_id;
    const userId = req.user?.id;
    
    await this.revisionsService.updateRevisionNote(
      revisionId,
      orgId,
      userId,
      body.note,
    );

    return { success: true };
  }
}
