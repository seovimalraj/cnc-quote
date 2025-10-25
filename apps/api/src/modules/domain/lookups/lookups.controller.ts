/**
 * Step 14: Lookups Controller
 * Provides lookup data for UIs (reason codes, etc.)
 */

import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OutcomesService } from "../../legacy/quotes-legacy/outcomes/outcomes.service";
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { OrgGuard } from "../../core/auth/org.guard";

@ApiTags('Lookups')
@ApiBearerAuth()
@Controller('lookups')
@UseGuards(JwtAuthGuard, OrgGuard)
export class LookupsController {
  constructor(private readonly outcomesService: OutcomesService) {}

  /**
   * Get active outcome reason codes
   */
  @Get('outcome-reasons')
  @ApiOperation({ summary: 'Get list of outcome reason codes for dropdowns' })
  @ApiResponse({ status: 200, description: 'Reason codes retrieved' })
  async getReasonCodes() {
    return await this.outcomesService.getReasonCodes();
  }
}
