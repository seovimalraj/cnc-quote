import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { SupabaseService } from "../../lib/supabase/supabase.service";

export type ToleranceUnit = "mm" | "um" | "deg";
export type ToleranceAffect = "machine_time" | "setup_time" | "risk";
export type ToleranceProcess = "cnc_milling" | "turning" | "sheet_metal" | "injection_molding";
export type ToleranceFeatureType = "hole" | "slot" | "pocket" | "flatness" | "position" | "thread" | "profile";
export type ToleranceAppliesTo = "diameter" | "width" | "depth" | "runout" | "flatness" | "true_position" | "pitch" | "generic";

export interface ToleranceCostBookRow {
  id: number;
  process: ToleranceProcess;
  featureType: ToleranceFeatureType;
  appliesTo: ToleranceAppliesTo;
  unitType: ToleranceUnit;
  tolFrom: number;
  tolTo: number;
  multiplier: number;
  affects: ToleranceAffect[];
  notes: string | null;
  catalogVersion: number;
}

interface RawToleranceRow {
  id: number;
  process: string;
  feature_type: string;
  applies_to: string;
  unit_type: string;
  tol_from: string | number;
  tol_to: string | number;
  multiplier: string | number;
  affects: string[] | null;
  notes: string | null;
  catalog_version: number | null;
}

interface CatalogVersionCache {
  value: number;
  expiresAt: number;
}

@Injectable()
export class ToleranceCostBookRepository implements OnModuleDestroy {
  private readonly logger = new Logger(ToleranceCostBookRepository.name);
  private readonly cacheTtlSeconds = 900;
  private readonly inMemoryCache = new Map<string, { rows: ToleranceCostBookRow[]; expiresAt: number }>();
  private redisClientPromise: Promise<Redis> | null = null;
  private catalogVersionCache: CatalogVersionCache | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (!this.redisClientPromise) {
      return;
    }
    try {
      const client = await this.redisClientPromise;
      await client.quit();
    } catch (error) {
      this.logger.warn(`Failed to close tolerance Redis client: ${(error as Error).message}`);
    }
  }

  async findMatches(
    process: ToleranceProcess,
    featureType: ToleranceFeatureType,
    appliesTo: ToleranceAppliesTo,
    unitType: ToleranceUnit,
    toleranceValue: number,
  ): Promise<ToleranceCostBookRow[]> {
    const catalogVersion = await this.getCatalogVersion();
    const cacheKey = this.buildCacheKey(catalogVersion, process, featureType, appliesTo, unitType);
    const rows = await this.loadRows(cacheKey, () =>
      this.fetchRows(process, featureType, appliesTo, unitType, catalogVersion),
    );

    if (!rows.length) {
      return [];
    }

    return rows.filter((row) => toleranceValue >= row.tolFrom && toleranceValue < row.tolTo);
  }

  async getCatalogVersion(): Promise<number> {
    const override = this.configService.get<number>("CATALOG_TOL_VERSION");
    if (override && Number.isFinite(override)) {
      return Number(override);
    }

    const now = Date.now();
    if (this.catalogVersionCache && this.catalogVersionCache.expiresAt > now) {
      return this.catalogVersionCache.value;
    }

    const { data, error } = await this.supabase.client
      .from("tolerance_cost_book")
      .select("catalog_version")
      .eq("active", true)
      .order("catalog_version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.warn("Failed to load tolerance catalog version", { error });
    }

    const version = data?.catalog_version ?? 1;
    this.catalogVersionCache = {
      value: version,
      expiresAt: now + 5 * 60 * 1000,
    };

    return version;
  }

  private async loadRows(
    cacheKey: string,
    loader: () => Promise<ToleranceCostBookRow[]>,
  ): Promise<ToleranceCostBookRow[]> {
    const now = Date.now();
    const memory = this.inMemoryCache.get(cacheKey);
    if (memory && memory.expiresAt > now) {
      return memory.rows;
    }

    const cached = await this.getCachedRows(cacheKey);
    if (cached) {
      this.inMemoryCache.set(cacheKey, { rows: cached, expiresAt: now + this.cacheTtlSeconds * 1000 });
      return cached;
    }

    const rows = await loader();
    this.inMemoryCache.set(cacheKey, { rows, expiresAt: now + this.cacheTtlSeconds * 1000 });
    await this.setCachedRows(cacheKey, rows);
    return rows;
  }

  private async fetchRows(
    process: ToleranceProcess,
    featureType: ToleranceFeatureType,
    appliesTo: ToleranceAppliesTo,
    unitType: ToleranceUnit,
    catalogVersion: number,
  ): Promise<ToleranceCostBookRow[]> {
    const { data, error } = await this.supabase.client
      .from("tolerance_cost_book")
      .select("id, process, feature_type, applies_to, unit_type, tol_from, tol_to, multiplier, affects, notes, catalog_version")
      .eq("process", process)
      .eq("feature_type", featureType)
      .eq("applies_to", appliesTo)
      .eq("unit_type", unitType)
      .eq("catalog_version", catalogVersion)
      .eq("active", true)
      .order("tol_from", { ascending: true });

    if (error) {
      this.logger.error("Failed to fetch tolerance cost book rows", {
        error,
        process,
        featureType,
        appliesTo,
        unitType,
        catalogVersion,
      });
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return this.normalizeRows(data as RawToleranceRow[]);
  }

  private normalizeRows(rows: RawToleranceRow[]): ToleranceCostBookRow[] {
    return rows
      .map((row) => {
        const affects = Array.isArray(row.affects) ? row.affects : [];
        return {
          id: row.id,
          process: row.process as ToleranceProcess,
          featureType: row.feature_type as ToleranceFeatureType,
          appliesTo: row.applies_to as ToleranceAppliesTo,
          unitType: row.unit_type as ToleranceUnit,
          tolFrom: Number(row.tol_from),
          tolTo: Number(row.tol_to),
          multiplier: Number(row.multiplier),
          affects: affects.filter((value): value is ToleranceAffect =>
            value === "machine_time" || value === "setup_time" || value === "risk"
          ),
          notes: row.notes ?? null,
          catalogVersion: row.catalog_version ?? 1,
        };
      })
      .sort((a, b) => a.tolFrom - b.tolFrom);
  }

  private buildCacheKey(
    version: number,
    process: string,
    featureType: string,
    appliesTo: string,
    unitType: string,
  ): string {
    return `tolbook:${version}:${process}:${featureType}:${appliesTo}:${unitType}`;
  }

  private async getCachedRows(cacheKey: string): Promise<ToleranceCostBookRow[] | null> {
    try {
      const client = await this.getRedisClient();
      const encoded = await client.get(cacheKey);
      if (!encoded) {
        return null;
      }
      const parsed = JSON.parse(encoded) as { rows: ToleranceCostBookRow[]; cached_at: string };
      return Array.isArray(parsed.rows) ? parsed.rows : null;
    } catch (error) {
      this.logger.warn(`Failed to read tolerance rows from Redis for ${cacheKey}: ${(error as Error).message}`);
      return null;
    }
  }

  private async setCachedRows(cacheKey: string, rows: ToleranceCostBookRow[]): Promise<void> {
    try {
      const client = await this.getRedisClient();
      const payload = JSON.stringify({ rows, cached_at: new Date().toISOString() });
      if (rows.length === 0) {
        await client.set(cacheKey, payload, "EX", this.cacheTtlSeconds);
        return;
      }
      await client.set(cacheKey, payload, "EX", this.cacheTtlSeconds);
    } catch (error) {
      this.logger.warn(`Failed to cache tolerance rows for ${cacheKey}: ${(error as Error).message}`);
    }
  }

  private async getRedisClient(): Promise<Redis> {
    if (!this.redisClientPromise) {
      const url = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
      this.redisClientPromise = Promise.resolve(new Redis(url));
    }
    return this.redisClientPromise;
  }
}
