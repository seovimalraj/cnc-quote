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
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
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

  constructor(
    private readonly leadtimeService: LeadtimeService,
    @Inject('DATABASE_POOL') private readonly pool: Pool,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

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
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      let upserted = 0;

      for (const entry of dto.entries) {
        const query = `
          INSERT INTO capacity_ledger (
            org_id, process, machine_group, day, 
            capacity_minutes, booked_minutes, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (org_id, process, machine_group, day)
          DO UPDATE SET
            capacity_minutes = EXCLUDED.capacity_minutes,
            booked_minutes = COALESCE(EXCLUDED.booked_minutes, capacity_ledger.booked_minutes),
            notes = COALESCE(EXCLUDED.notes, capacity_ledger.notes),
            updated_at = NOW()
        `;

        await client.query(query, [
          entry.orgId,
          entry.process,
          entry.machineGroup,
          entry.day,
          entry.capacityMinutes,
          entry.bookedMinutes ?? 0,
          entry.notes ?? null,
        ]);

        upserted++;

        // Invalidate cache for this machine group
        await this.leadtimeService.invalidateCapacityCache(
          entry.orgId,
          entry.process,
          entry.machineGroup,
        );
      }

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      this.logger.log(
        `Bulk upserted ${upserted} capacity entries in ${duration}ms`,
      );

      // Emit telemetry
      this.emitCapacityBulkUpsertEvent({
        rows: upserted,
        actor: req.user?.id || 'system',
        orgIds: [...new Set(dto.entries.map((e) => e.orgId))],
      });

      return { upserted };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Bulk upsert failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      client.release();
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
    const query = `
      SELECT 
        day::TEXT as day,
        capacity_minutes as "capacityMinutes",
        booked_minutes as "bookedMinutes",
        CASE 
          WHEN capacity_minutes = 0 THEN 1.0
          ELSE LEAST(1.0, booked_minutes::NUMERIC / capacity_minutes::NUMERIC)
        END as utilization,
        machine_group as "machineGroup",
        process,
        notes
      FROM capacity_ledger
      WHERE org_id = $1
        AND process = $2
        AND machine_group = $3
        AND day >= $4::DATE
        AND day <= $5::DATE
      ORDER BY day ASC
    `;

    const result = await this.pool.query(query, [
      dto.orgId,
      dto.process,
      dto.machineGroup,
      dto.from,
      dto.to,
    ]);

    return result.rows.map((row) => ({
      ...row,
      utilization: Number(row.utilization),
    }));
  }

  @Post('overrides')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update lead time override' })
  @ApiResponse({ status: 201, description: 'Override created' })
  async createOverride(
    @Body() dto: CreateLeadtimeOverrideDto,
    @Req() req: any,
  ): Promise<{ id: string }> {
    const query = `
      INSERT INTO leadtime_overrides (
        org_id, process, day, class, blocked, reason, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (org_id, process, day, class)
      DO UPDATE SET
        blocked = EXCLUDED.blocked,
        reason = EXCLUDED.reason,
        created_by = EXCLUDED.created_by,
        created_at = NOW()
      RETURNING id
    `;

    const result = await this.pool.query(query, [
      dto.orgId,
      dto.process,
      dto.day,
      dto.class,
      dto.blocked,
      dto.reason ?? null,
      req.user?.id ?? null,
    ]);

    const id = result.rows[0].id;

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
    const query = `
      SELECT 
        id,
        org_id as "orgId",
        process,
        day::TEXT as day,
        class,
        blocked,
        reason,
        created_by as "createdBy",
        created_at as "createdAt"
      FROM leadtime_overrides
      WHERE org_id = $1
        AND process = $2
        AND day >= $3::DATE
        AND day <= $4::DATE
      ORDER BY day ASC, class ASC
    `;

    const result = await this.pool.query(query, [orgId, process, from, to]);
    return result.rows;
  }

  @Get('profiles')
  @ApiOperation({ summary: 'Get lead time profile for org and process' })
  @ApiResponse({ status: 200, description: 'Lead time profile' })
  async getProfile(@Query() dto: GetLeadtimeProfileDto): Promise<any> {
    const query = `
      SELECT 
        id,
        org_id as "orgId",
        process,
        econ_days as "econDays",
        std_days as "stdDays",
        express_days as "expressDays",
        surge_multiplier as "surgeMultiplier",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM leadtime_profiles
      WHERE org_id = $1 AND process = $2
    `;

    const result = await this.pool.query(query, [dto.orgId, dto.process]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      surgeMultiplier: Number(result.rows[0].surgeMultiplier),
    };
  }

  @Put('profiles')
  @ApiOperation({ summary: 'Update lead time profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @Query() getDto: GetLeadtimeProfileDto,
    @Body() updateDto: UpdateLeadtimeProfileDto,
  ): Promise<{ updated: boolean }> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateDto.econDays !== undefined) {
      updates.push(`econ_days = $${paramIndex++}`);
      values.push(updateDto.econDays);
    }

    if (updateDto.stdDays !== undefined) {
      updates.push(`std_days = $${paramIndex++}`);
      values.push(updateDto.stdDays);
    }

    if (updateDto.expressDays !== undefined) {
      updates.push(`express_days = $${paramIndex++}`);
      values.push(updateDto.expressDays);
    }

    if (updateDto.surgeMultiplier !== undefined) {
      updates.push(`surge_multiplier = $${paramIndex++}`);
      values.push(updateDto.surgeMultiplier);
    }

    if (updates.length === 0) {
      return { updated: false };
    }

    updates.push(`updated_at = NOW()`);
    values.push(getDto.orgId, getDto.process);

    const query = `
      UPDATE leadtime_profiles
      SET ${updates.join(', ')}
      WHERE org_id = $${paramIndex++} AND process = $${paramIndex++}
    `;

    await this.pool.query(query, values);

    // Invalidate cache
    await this.leadtimeService.invalidateProfileCache(
      getDto.orgId,
      getDto.process,
    );

    this.logger.log(
      `Updated profile: org=${getDto.orgId}, process=${getDto.process}`,
    );

    return { updated: true };
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
