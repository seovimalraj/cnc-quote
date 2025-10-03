/**
 * Step 12: Lead Time Service
 * Core business logic for dynamic lead time calculation with surge pricing
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import {
  LeadClass,
  LeadtimeOption,
  LeadtimeResponse,
  PricingHookInput,
  LeadtimeProfile,
  CapacityDay,
  LeadtimeOverride,
} from '@cnc-quote/shared';
import {
  addBusinessDays,
  calculateP95,
  getTodayInTimezone,
  getBusinessDaysWindow,
  formatDateInTimezone,
} from './business-days.util';

@Injectable()
export class LeadtimeService {
  private readonly logger = new Logger(LeadtimeService.name);

  constructor(
    @Inject('DATABASE_POOL') private readonly pool: Pool,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Compute lead time options with dynamic surge pricing
   */
  async computeOptions(input: PricingHookInput): Promise<LeadtimeResponse> {
    const startTime = Date.now();

    try {
      // Get org timezone (default UTC)
      const orgTimezone = await this.getOrgTimezone(input.orgId);

      // Fetch lead time profile
      const profile = await this.getLeadtimeProfile(input.orgId, input.process);

      if (!profile) {
        this.logger.warn(
          `No lead time profile found for org=${input.orgId}, process=${input.process}`,
        );
        return this.fallbackResponse(input.basePrice);
      }

      const classes: LeadClass[] = ['econ', 'standard', 'express'];
      const options: LeadtimeOption[] = [];

      // Get org holidays
      const holidays = await this.getOrgHolidays(input.orgId);

      for (const cls of classes) {
        try {
          const option = await this.computeClassOption({
            cls,
            profile,
            input,
            orgTimezone,
            holidays,
          });

          if (option) {
            options.push(option);
          }
        } catch (error) {
          this.logger.error(
            `Error computing option for class=${cls}: ${error.message}`,
            error.stack,
          );
        }
      }

      // Sort by days (ascending)
      options.sort((a, b) => a.days - b.days);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Computed ${options.length} lead time options in ${duration}ms for org=${input.orgId}, process=${input.process}`,
      );

      // Emit telemetry
      await this.emitOptionsRequestedEvent(input, options.length);

      return {
        options,
        basePrice: input.basePrice,
        currency: 'INR',
      };
    } catch (error) {
      this.logger.error(
        `Failed to compute lead time options: ${error.message}`,
        error.stack,
      );
      return this.fallbackResponse(input.basePrice);
    }
  }

  /**
   * Compute option for a single lead time class
   */
  private async computeClassOption(params: {
    cls: LeadClass;
    profile: LeadtimeProfile;
    input: PricingHookInput;
    orgTimezone: string;
    holidays: string[];
  }): Promise<LeadtimeOption | null> {
    const { cls, profile, input, orgTimezone, holidays } = params;

    // Get days for this class
    const days =
      cls === 'econ'
        ? profile.econDays
        : cls === 'standard'
        ? profile.stdDays
        : profile.expressDays;

    // Calculate window of business days
    const today = getTodayInTimezone(orgTimezone);
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() + 1); // Start from tomorrow

    const windowDays = getBusinessDaysWindow(
      windowStart,
      addBusinessDays(windowStart, days - 1, {
        timezone: orgTimezone,
        holidays,
      }),
      { timezone: orgTimezone, holidays },
    );

    // Fetch capacity data for window
    const capacityRows = await this.fetchCapacityWindow({
      orgId: input.orgId,
      process: input.process,
      machineGroup: input.machineGroup,
      days: windowDays,
    });

    // Calculate P95 utilization
    const utilizations = capacityRows.map((row) => row.utilization);
    const p95 = utilizations.length > 0 ? calculateP95(utilizations) : 0;

    // Check for manual overrides
    const blocked = await this.checkOverrideBlock({
      orgId: input.orgId,
      process: input.process,
      class: cls,
      days: windowDays,
    });

    if (blocked) {
      this.logger.debug(
        `Class ${cls} blocked by override for org=${input.orgId}, process=${input.process}`,
      );
      return null;
    }

    // Check if unavailable due to high utilization
    let surgeApplied = p95 >= 0.85;
    const unavailable = p95 >= 0.95;

    if (unavailable) {
      // Check for manual unblock
      const unblocked = await this.checkManualUnblock({
        orgId: input.orgId,
        process: input.process,
        class: cls,
        days: windowDays,
      });

      if (!unblocked) {
        this.logger.debug(
          `Class ${cls} unavailable due to utilization=${p95.toFixed(3)} for org=${input.orgId}`,
        );
        return null;
      }

      // Still apply surge if manually unblocked
      surgeApplied = true;
    }

    // Calculate price delta
    const multiplier = surgeApplied ? Number(profile.surgeMultiplier) : 1;
    let priceDelta = input.basePrice * (multiplier - 1);

    // Economy discount for low utilization
    if (cls === 'econ' && p95 <= 0.5) {
      const discount = input.basePrice * 0.03; // 3% discount
      priceDelta = -Math.min(discount, Math.abs(priceDelta));
    }

    // Clamp price delta
    priceDelta = Math.max(-input.basePrice, priceDelta);

    // Calculate ship date
    const shipDate = formatDateInTimezone(
      addBusinessDays(today, days, { timezone: orgTimezone, holidays }),
      orgTimezone,
    );

    // Build reasons
    const reasons = this.explainOption({
      cls,
      p95,
      surgeApplied,
      profile,
      capacityRowCount: capacityRows.length,
    });

    return {
      class: cls,
      days,
      shipDate,
      priceDelta: Number(priceDelta.toFixed(2)),
      surgeApplied,
      utilizationWindow: Number(p95.toFixed(3)),
      reasons,
    };
  }

  /**
   * Fetch capacity data for a window of days
   */
  private async fetchCapacityWindow(params: {
    orgId: string;
    process: string;
    machineGroup: string;
    days: string[];
  }): Promise<CapacityDay[]> {
    const { orgId, process, machineGroup, days } = params;

    if (days.length === 0) {
      return [];
    }

    // Check cache
    const cacheKey = `leadtime:window:${orgId}:${process}:${machineGroup}:${days[0]}:${days[days.length - 1]}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
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
        process
      FROM capacity_ledger
      WHERE org_id = $1
        AND process = $2
        AND machine_group = $3
        AND day = ANY($4::DATE[])
      ORDER BY day ASC
    `;

    const result = await this.pool.query(query, [
      orgId,
      process,
      machineGroup,
      days,
    ]);

    const capacityDays: CapacityDay[] = result.rows.map((row) => ({
      ...row,
      utilization: Number(row.utilization),
    }));

    // Fill in missing days with zero capacity (utilization = 0)
    const daySet = new Set(capacityDays.map((d) => d.day));
    for (const day of days) {
      if (!daySet.has(day)) {
        capacityDays.push({
          day,
          capacityMinutes: 0,
          bookedMinutes: 0,
          utilization: 0,
          machineGroup,
          process,
        });
      }
    }

    // Sort by day
    capacityDays.sort((a, b) => a.day.localeCompare(b.day));

    // Cache for 60 seconds
    await this.redis.setex(cacheKey, 60, JSON.stringify(capacityDays));

    return capacityDays;
  }

  /**
   * Check if a class is blocked by override for any day in window
   */
  private async checkOverrideBlock(params: {
    orgId: string;
    process: string;
    class: LeadClass;
    days: string[];
  }): Promise<boolean> {
    const { orgId, process, class: cls, days } = params;

    if (days.length === 0) {
      return false;
    }

    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM leadtime_overrides
        WHERE org_id = $1
          AND process = $2
          AND class = $3
          AND day = ANY($4::DATE[])
          AND blocked = TRUE
      ) as blocked
    `;

    const result = await this.pool.query(query, [orgId, process, cls, days]);
    return result.rows[0]?.blocked || false;
  }

  /**
   * Check if class has manual unblock override
   */
  private async checkManualUnblock(params: {
    orgId: string;
    process: string;
    class: LeadClass;
    days: string[];
  }): Promise<boolean> {
    const { orgId, process, class: cls, days } = params;

    if (days.length === 0) {
      return false;
    }

    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM leadtime_overrides
        WHERE org_id = $1
          AND process = $2
          AND class = $3
          AND day = ANY($4::DATE[])
          AND blocked = FALSE
      ) as unblocked
    `;

    const result = await this.pool.query(query, [orgId, process, cls, days]);
    return result.rows[0]?.unblocked || false;
  }

  /**
   * Get lead time profile from DB (with caching)
   */
  private async getLeadtimeProfile(
    orgId: string,
    process: string,
  ): Promise<LeadtimeProfile | null> {
    const cacheKey = `leadtime:profile:${orgId}:${process}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

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

    const result = await this.pool.query(query, [orgId, process]);

    if (result.rows.length === 0) {
      return null;
    }

    const profile: LeadtimeProfile = {
      ...result.rows[0],
      surgeMultiplier: Number(result.rows[0].surgeMultiplier),
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(profile));

    return profile;
  }

  /**
   * Get org timezone (cached)
   */
  private async getOrgTimezone(orgId: string): Promise<string> {
    const cacheKey = `org:timezone:${orgId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return cached;
    }

    const query = `SELECT timezone FROM orgs WHERE id = $1`;
    const result = await this.pool.query(query, [orgId]);

    const timezone = result.rows[0]?.timezone || 'UTC';

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, timezone);

    return timezone;
  }

  /**
   * Get org holidays (cached)
   */
  private async getOrgHolidays(orgId: string): Promise<string[]> {
    // TODO: Implement holiday fetching from env var or DB
    // For now, return empty array
    return [];
  }

  /**
   * Explain why an option has its characteristics
   */
  private explainOption(params: {
    cls: LeadClass;
    p95: number;
    surgeApplied: boolean;
    profile: LeadtimeProfile;
    capacityRowCount: number;
  }): string[] {
    const { cls, p95, surgeApplied, profile, capacityRowCount } = params;
    const reasons: string[] = [];

    if (capacityRowCount === 0) {
      reasons.push('No capacity data available; using default lead time');
    }

    if (p95 <= 0.5 && cls === 'econ') {
      reasons.push('Low utilization window - economy discount applied');
    }

    if (surgeApplied) {
      reasons.push(
        `P95 utilization >= 85% => surge multiplier ${profile.surgeMultiplier}x applied`,
      );
    }

    if (p95 >= 0.95) {
      reasons.push('High utilization (≥95%) - class at risk of unavailability');
    }

    return reasons;
  }

  /**
   * Fallback response when calculation fails
   */
  private fallbackResponse(basePrice: number): LeadtimeResponse {
    return {
      options: [
        {
          class: 'standard',
          days: 7,
          shipDate: formatDateInTimezone(
            addBusinessDays(new Date(), 7, { timezone: 'UTC', holidays: [] }),
            'UTC',
          ),
          priceDelta: 0,
          surgeApplied: false,
          utilizationWindow: 0,
          reasons: ['Capacity unavailable; using defaults'],
        },
      ],
      basePrice,
      currency: 'INR',
    };
  }

  /**
   * Emit telemetry event
   */
  private async emitOptionsRequestedEvent(
    input: PricingHookInput,
    optionsCount: number,
  ): Promise<void> {
    try {
      // TODO: Integrate with actual telemetry system
      this.logger.debug(
        `LEADTIME_OPTIONS_REQUESTED: org=${input.orgId}, process=${input.process}, options=${optionsCount}`,
      );
    } catch (error) {
      this.logger.error(`Failed to emit telemetry: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for capacity window
   */
  async invalidateCapacityCache(
    orgId: string,
    process: string,
    machineGroup: string,
  ): Promise<void> {
    const pattern = `leadtime:window:${orgId}:${process}:${machineGroup}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.debug(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
    }
  }

  /**
   * Invalidate cache for profile
   */
  async invalidateProfileCache(orgId: string, process: string): Promise<void> {
    const cacheKey = `leadtime:profile:${orgId}:${process}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`Invalidated profile cache: ${cacheKey}`);
  }
}
