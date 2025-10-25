/**
 * Step 12: Lead Time Controller
 * REST API endpoints for lead time options and capacity management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeadtimeService } from './leadtime.service';
import {
  GetLeadtimeDto,
  CapacityBulkUpsertDto,
  GetCapacityWindowDto,
  CreateLeadtimeOverrideDto,
  UpdateLeadtimeProfileDto,
  GetLeadtimeProfileDto,
  LeadtimeResponse,
  CapacityDayResponse,
} from './dto/leadtime.dto';
import { PricingHookInput } from '@cnc-quote/shared';

@ApiTags('leadtime')
@Controller('leadtime')
export class LeadtimeController {
  private readonly logger = new Logger(LeadtimeController.name);
  constructor(private readonly leadtimeService: LeadtimeService) {}

  @Get('options')
  @ApiOperation({ summary: 'Get lead time options with dynamic pricing' })
  @ApiResponse({ status: 200, description: 'Lead time options', type: LeadtimeResponse })
  async getOptions(@Query() dto: GetLeadtimeDto): Promise<LeadtimeResponse> {
    const input: PricingHookInput = {
      orgId: dto.orgId,
      process: dto.process,
      machineGroup: dto.machineGroup,
      basePrice: dto.basePrice,
      estimatedMinutes: dto.estimatedMinutes,
      desiredClass: dto.desiredClass as any,
    };

    return this.leadtimeService.computeOptions(input);
  }

  @Post('capacity/bulk-upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert capacity ledger entries' })
  @ApiResponse({ status: 200, description: 'Capacity entries upserted' })
  async bulkUpsertCapacity(
    @Body() dto: CapacityBulkUpsertDto,
    @Req() req: any,
  ): Promise<{ upserted: number }> {
    const startTime = Date.now();

    try {
      const { upserted, orgIds } = await this.leadtimeService.bulkUpsertCapacity(
        dto.entries,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Bulk upserted ${upserted} capacity entries in ${duration}ms`,
      );

      this.emitCapacityBulkUpsertEvent({
        rows: upserted,
        actor: req.user?.id || 'system',
        orgIds,
      });

      return { upserted };
    } catch (error) {
      this.logger.error(`Bulk upsert failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('capacity/window')
  @ApiOperation({ summary: 'Get capacity window for date range' })
  @ApiResponse({
    status: 200,
    description: 'Capacity entries',
    type: [CapacityDayResponse],
  })
  async getCapacityWindow(
    @Query() dto: GetCapacityWindowDto,
  ): Promise<CapacityDayResponse[]> {
    const rows = await this.leadtimeService.getCapacityWindowEntries(dto);
    return rows as CapacityDayResponse[];
  }

  @Post('overrides')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update lead time override' })
  @ApiResponse({ status: 201, description: 'Override created' })
  async createOverride(
    @Body() dto: CreateLeadtimeOverrideDto,
    @Req() req: any,
  ): Promise<{ id: string }> {
    const id = await this.leadtimeService.createOrUpdateOverride(
      dto,
      req.user?.id ?? null,
    );

    this.logger.log(
      `Created override: org=${dto.orgId}, process=${dto.process}, day=${dto.day}, class=${dto.class}, blocked=${dto.blocked}`,
    );

    // Emit telemetry
    this.emitOverrideSetEvent({
      orgId: dto.orgId,
      process: dto.process,
      day: dto.day,
      class: dto.class,
      blocked: dto.blocked,
      actor: req.user?.id || 'system',
    });

    return { id };
  }

  @Get('overrides')
  @ApiOperation({ summary: 'Get lead time overrides for date range' })
  @ApiResponse({ status: 200, description: 'Override entries' })
  async getOverrides(
    @Query('orgId') orgId: string,
    @Query('process') process: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<any[]> {
    return this.leadtimeService.listOverrides({ orgId, process, from, to });
  }

  @Get('profiles')
  @ApiOperation({ summary: 'Get lead time profile for org and process' })
  @ApiResponse({ status: 200, description: 'Lead time profile' })
  async getProfile(@Query() dto: GetLeadtimeProfileDto): Promise<any> {
    const profile = await this.leadtimeService.getLeadtimeProfile(
      dto.orgId,
      dto.process,
    );

    if (!profile) {
      return null;
    }

    return {
      ...profile,
      surgeMultiplier: Number(profile.surgeMultiplier),
    };
  }

  @Put('profiles')
  @ApiOperation({ summary: 'Update lead time profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @Query() getDto: GetLeadtimeProfileDto,
    @Body() updateDto: UpdateLeadtimeProfileDto,
  ): Promise<{ updated: boolean }> {
    const updated = await this.leadtimeService.updateProfile(
      getDto.orgId,
      getDto.process,
      updateDto,
    );

    if (updated) {
      this.logger.log(
        `Updated profile: org=${getDto.orgId}, process=${getDto.process}`,
      );
    }

    return { updated };
  }

  /**
   * Emit telemetry events
   */
  private emitCapacityBulkUpsertEvent(data: {
    rows: number;
    actor: string;
    orgIds: string[];
  }): void {
    this.logger.debug(
      `CAPACITY_BULK_UPSERT: rows=${data.rows}, actor=${data.actor}, orgs=${data.orgIds.length}`,
    );
  }

  private emitOverrideSetEvent(data: {
    orgId: string;
    process: string;
    day: string;
    class: string;
    blocked: boolean;
    actor: string;
  }): void {
    this.logger.debug(
      `LEADTIME_OVERRIDE_SET: org=${data.orgId}, process=${data.process}, day=${data.day}, class=${data.class}, blocked=${data.blocked}`,
    );
  }
}
