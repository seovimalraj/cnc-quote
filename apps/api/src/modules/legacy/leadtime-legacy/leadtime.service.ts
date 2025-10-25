/**
 * Step 12: Lead Time Service
 * Core business logic for dynamic lead time calculation with surge pricing
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  LeadClass,
  LeadtimeOption,
  LeadtimeResponse,
  PricingHookInput,
  LeadtimeProfile,
  CapacityDay,
} from '@cnc-quote/shared';
import type {
  CapacityBulkUpsertDto,
  CreateLeadtimeOverrideDto,
  GetCapacityWindowDto,
  UpdateLeadtimeProfileDto,
} from './dto/leadtime.dto';
import {
  addBusinessDays,
  calculateP95,
  getTodayInTimezone,
  getBusinessDaysWindow,
  formatDateInTimezone,
} from './business-days.util';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";

type CapacityEntryInput = CapacityBulkUpsertDto['entries'][number];
type CapacityWindowEntry = CapacityDay & { notes?: string | null };
type CachedLeadtimeProfile = Omit<LeadtimeProfile, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};
type LeadtimeOverrideRecord = {
  id: string;
  orgId: string;
  process: string;
  day: string;
  class: LeadClass;
  blocked: boolean;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

@Injectable()
export class LeadtimeService {
  private readonly logger = new Logger(LeadtimeService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
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
    const uniqueDays = Array.from(new Set(days));
    uniqueDays.sort();

    const cacheKey = this.buildCapacityCacheKey(
      orgId,
      process,
      machineGroup,
      uniqueDays[0],
      uniqueDays[uniqueDays.length - 1],
    );
    const cached = await this.cache.get<CapacityDay[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase.client
      .from('capacity_ledger')
      .select('day, capacity_minutes, booked_minutes, machine_group, process')
      .eq('org_id', orgId)
      .eq('process', process)
      .eq('machine_group', machineGroup)
      .in('day', uniqueDays)
      .order('day', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch capacity window for org=${orgId}, process=${process}, machineGroup=${machineGroup}: ${error.message}`,
      );
      return [];
    }

    const capacityDays: CapacityDay[] = (data ?? []).map((row: any) => {
      const capacityMinutes = Number(row.capacity_minutes ?? 0);
      const bookedMinutes = Number(row.booked_minutes ?? 0);

      return {
        day: row.day,
        capacityMinutes,
        bookedMinutes,
        utilization: this.computeUtilization(capacityMinutes, bookedMinutes),
        machineGroup: row.machine_group,
        process: row.process,
      } satisfies CapacityDay;
    });

    const daySet = new Set(capacityDays.map((d) => d.day));
    for (const day of uniqueDays) {
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

    capacityDays.sort((a, b) => a.day.localeCompare(b.day));

    await this.cache.set(cacheKey, capacityDays, 60);

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

    const { data, error } = await this.supabase.client
      .from('leadtime_overrides')
      .select('id')
      .eq('org_id', orgId)
      .eq('process', process)
      .eq('class', cls)
      .in('day', days)
      .eq('blocked', true)
      .limit(1);

    if (error) {
      this.logger.error(
        `Failed to evaluate override block for org=${orgId}, process=${process}, class=${cls}: ${error.message}`,
      );
      return false;
    }

    return Boolean(data && data.length);
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

    const { data, error } = await this.supabase.client
      .from('leadtime_overrides')
      .select('id')
      .eq('org_id', orgId)
      .eq('process', process)
      .eq('class', cls)
      .in('day', days)
      .eq('blocked', false)
      .limit(1);

    if (error) {
      this.logger.error(
        `Failed to evaluate manual unblocks for org=${orgId}, process=${process}, class=${cls}: ${error.message}`,
      );
      return false;
    }

    return Boolean(data && data.length);
  }

  /**
   * Get lead time profile from DB (with caching)
   */
  async getLeadtimeProfile(
    orgId: string,
    process: string,
  ): Promise<LeadtimeProfile | null> {
    const cacheKey = `leadtime:profile:${orgId}:${process}`;
    const cached = await this.cache.get<CachedLeadtimeProfile>(cacheKey);

    if (cached) {
      return this.hydrateProfileFromCache(cached);
    }

    const { data, error } = await this.supabase.client
      .from('leadtime_profiles')
      .select(
        'id, org_id, process, econ_days, std_days, express_days, surge_multiplier, created_at, updated_at',
      )
      .eq('org_id', orgId)
      .eq('process', process)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to load lead time profile for org=${orgId}, process=${process}: ${error.message}`,
      );
      return null;
    }

    if (!data) {
      return null;
    }

    const profile: LeadtimeProfile = {
      id: data.id,
      orgId: data.org_id,
      process: data.process,
      econDays: Number(data.econ_days),
      stdDays: Number(data.std_days),
      expressDays: Number(data.express_days),
      surgeMultiplier: Number(data.surge_multiplier ?? 1),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    await this.cache.set<CachedLeadtimeProfile>(
      cacheKey,
      {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      300,
    );

    return profile;
  }

  /**
   * Get org timezone (cached)
   */
  private async getOrgTimezone(orgId: string): Promise<string> {
    const cacheKey = `org:timezone:${orgId}`;
    const cached = await this.cache.get<string>(cacheKey);

    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase.client
      .from('orgs')
      .select('timezone')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to resolve org timezone for org=${orgId}: ${error.message}`,
      );
    }

    const timezone = data?.timezone ?? 'UTC';

    await this.cache.set(cacheKey, timezone, 3600);

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
    const keys = await this.cache.keys(pattern);

    if (keys.length === 0) {
      return;
    }

    await Promise.all(keys.map((key) => this.cache.del(key)));
    this.logger.debug(
      `Invalidated ${keys.length} cache keys for pattern: ${pattern}`,
    );
  }

  /**
   * Invalidate cache for profile
   */
  async invalidateProfileCache(orgId: string, process: string): Promise<void> {
    const cacheKey = `leadtime:profile:${orgId}:${process}`;
    await this.cache.del(cacheKey);
    this.logger.debug(`Invalidated profile cache: ${cacheKey}`);
  }

  async bulkUpsertCapacity(
    entries: CapacityEntryInput[],
  ): Promise<{ upserted: number; orgIds: string[] }> {
    if (entries.length === 0) {
      return { upserted: 0, orgIds: [] };
    }

    let upserted = 0;
    const orgIds = new Set<string>();
    const cacheTargets = new Set<string>();
    const nowIso = new Date().toISOString();

    for (const entry of entries) {
      orgIds.add(entry.orgId);
      cacheTargets.add(
        JSON.stringify([entry.orgId, entry.process, entry.machineGroup]),
      );

      let existing: { booked_minutes: number | null; notes: string | null } | null =
        null;

      if (entry.bookedMinutes === undefined || entry.notes === undefined) {
        existing = await this.getExistingCapacityRow(entry);
      }

      const bookedMinutes =
        entry.bookedMinutes !== undefined
          ? entry.bookedMinutes
          : Number(existing?.booked_minutes ?? 0);

      const notes =
        entry.notes !== undefined ? entry.notes : existing?.notes ?? null;

      const payload = {
        org_id: entry.orgId,
        process: entry.process,
        machine_group: entry.machineGroup,
        day: entry.day,
        capacity_minutes: entry.capacityMinutes,
        booked_minutes: bookedMinutes,
        notes,
        updated_at: nowIso,
      };

      const { error } = await this.supabase.client
        .from('capacity_ledger')
        .upsert(payload, { onConflict: 'org_id,process,machine_group,day' });

      if (error) {
        this.logger.error(
          `Failed to upsert capacity row for org=${entry.orgId}, process=${entry.process}, machineGroup=${entry.machineGroup}, day=${entry.day}: ${error.message}`,
        );
        throw new Error(`Failed to upsert capacity: ${error.message}`);
      }

      upserted += 1;
    }

    for (const target of cacheTargets) {
      const [orgId, process, machineGroup] = JSON.parse(target) as [
        string,
        string,
        string,
      ];
      await this.invalidateCapacityCache(orgId, process, machineGroup);
    }

    return { upserted, orgIds: Array.from(orgIds) };
  }

  async getCapacityWindowEntries(
    params: GetCapacityWindowDto,
  ): Promise<CapacityWindowEntry[]> {
    const { orgId, process, machineGroup, from, to } = params;

    const { data, error } = await this.supabase.client
      .from('capacity_ledger')
      .select('day, capacity_minutes, booked_minutes, machine_group, process, notes')
      .eq('org_id', orgId)
      .eq('process', process)
      .eq('machine_group', machineGroup)
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch capacity window range for org=${orgId}, process=${process}, machineGroup=${machineGroup}: ${error.message}`,
      );
      throw new Error(`Failed to fetch capacity window: ${error.message}`);
    }

    return (data ?? []).map((row: any) => {
      const capacityMinutes = Number(row.capacity_minutes ?? 0);
      const bookedMinutes = Number(row.booked_minutes ?? 0);

      return {
        day: row.day,
        capacityMinutes,
        bookedMinutes,
        utilization: this.computeUtilization(capacityMinutes, bookedMinutes),
        machineGroup: row.machine_group,
        process: row.process,
        notes: row.notes ?? null,
      } satisfies CapacityWindowEntry;
    });
  }

  async createOrUpdateOverride(
    dto: CreateLeadtimeOverrideDto,
    actorId: string | null,
  ): Promise<string> {
    const nowIso = new Date().toISOString();

    const payload = {
      org_id: dto.orgId,
      process: dto.process,
      day: dto.day,
      class: dto.class,
      blocked: dto.blocked,
      reason: dto.reason ?? null,
      created_by: actorId ?? null,
      created_at: nowIso,
    };

    const { data, error } = await this.supabase.client
      .from('leadtime_overrides')
      .upsert(payload, { onConflict: 'org_id,process,day,class' })
      .select('id')
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to upsert lead time override for org=${dto.orgId}, process=${dto.process}, day=${dto.day}, class=${dto.class}: ${error.message}`,
      );
      throw new Error(`Failed to upsert override: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error('Lead time override upsert did not return an id');
    }

    return data.id;
  }

  async listOverrides(params: {
    orgId: string;
    process: string;
    from: string;
    to: string;
  }): Promise<LeadtimeOverrideRecord[]> {
    const { orgId, process, from, to } = params;

    const { data, error } = await this.supabase.client
      .from('leadtime_overrides')
      .select('id, org_id, process, day, class, blocked, reason, created_by, created_at')
      .eq('org_id', orgId)
      .eq('process', process)
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: true })
      .order('class', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch lead time overrides for org=${orgId}, process=${process}: ${error.message}`,
      );
      throw new Error(`Failed to fetch overrides: ${error.message}`);
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      orgId: row.org_id,
      process: row.process,
      day: row.day,
      class: row.class,
      blocked: row.blocked,
      reason: row.reason ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
    }));
  }

  async updateProfile(
    orgId: string,
    process: string,
    dto: UpdateLeadtimeProfileDto,
  ): Promise<boolean> {
    const updates: Record<string, unknown> = {};

    if (dto.econDays !== undefined) {
      updates.econ_days = dto.econDays;
    }

    if (dto.stdDays !== undefined) {
      updates.std_days = dto.stdDays;
    }

    if (dto.expressDays !== undefined) {
      updates.express_days = dto.expressDays;
    }

    if (dto.surgeMultiplier !== undefined) {
      updates.surge_multiplier = dto.surgeMultiplier;
    }

    if (Object.keys(updates).length === 0) {
      return false;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase.client
      .from('leadtime_profiles')
      .update(updates)
      .eq('org_id', orgId)
      .eq('process', process)
      .select('id');

    if (error) {
      this.logger.error(
        `Failed to update lead time profile for org=${orgId}, process=${process}: ${error.message}`,
      );
      throw new Error(`Failed to update lead time profile: ${error.message}`);
    }

    const updated = Boolean(data && data.length);

    if (updated) {
      await this.invalidateProfileCache(orgId, process);
    }

    return updated;
  }

  private buildCapacityCacheKey(
    orgId: string,
    process: string,
    machineGroup: string,
    startDay: string,
    endDay: string,
  ): string {
    return `leadtime:window:${orgId}:${process}:${machineGroup}:${startDay}:${endDay}`;
  }

  private computeUtilization(capacityMinutes: number, bookedMinutes: number): number {
    if (capacityMinutes <= 0) {
      return 1;
    }

    return Math.min(1, bookedMinutes / capacityMinutes);
  }

  private hydrateProfileFromCache(cached: CachedLeadtimeProfile): LeadtimeProfile {
    return {
      ...cached,
      createdAt: new Date(cached.createdAt),
      updatedAt: new Date(cached.updatedAt),
    };
  }

  private async getExistingCapacityRow(
    entry: CapacityEntryInput,
  ): Promise<{ booked_minutes: number | null; notes: string | null } | null> {
    const { data, error } = await this.supabase.client
      .from('capacity_ledger')
      .select('booked_minutes, notes')
      .eq('org_id', entry.orgId)
      .eq('process', entry.process)
      .eq('machine_group', entry.machineGroup)
      .eq('day', entry.day)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to load existing capacity row for org=${entry.orgId}, process=${entry.process}, machineGroup=${entry.machineGroup}, day=${entry.day}: ${error.message}`,
      );
      throw new Error(`Failed to load capacity ledger row: ${error.message}`);
    }

    return data ?? null;
  }
}
