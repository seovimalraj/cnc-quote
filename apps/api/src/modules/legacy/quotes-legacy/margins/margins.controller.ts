/**
 * Step 14: Margins Controller
 * REST endpoints for retrieving quote margins
 */

import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MarginsService } from './margins.service';
import { JwtAuthGuard } from "../../../core/auth/jwt.guard";
import { OrgGuard } from "../../../core/auth/org.guard";
import { RbacGuard } from "../../../core/auth/rbac.middleware";

@ApiTags('Quote Margins')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard, OrgGuard)
export class MarginsController {
  constructor(private readonly marginsService: MarginsService) {}

  /**
   * Get margins for a specific quote
   */
  @Get(':id/margins')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({ summary: 'Get quote margins with per-line breakdown' })
  @ApiResponse({ status: 200, description: 'Margins retrieved' })
  @ApiResponse({ status: 404, description: 'Quote not found or margins not finalized' })
  async getMargins(
    @Param('id') quoteId: string,
    @Request() req: any,
  ) {
    try {
      return await this.marginsService.getQuoteMargins(quoteId, req.user.org_id);
    } catch (error: any) {
      if (error.message.includes('NOT_FINALIZED')) {
        throw new NotFoundException(
          'Margins not finalized for this quote',
          'NOT_FINALIZED',
        );
      }
      throw error;
    }
  }
}
