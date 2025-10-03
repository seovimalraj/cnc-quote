import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { randomUUID } from "crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { PricingCacheRepository, PricingCacheRecord } from "./cache.repository";
import { computeStableHash, StableHashResult } from "./hash.util";

const LOCK_RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

interface CacheControlOptions {
  bust?: boolean;
  bypass?: boolean;
  cacheable?: boolean;
  ttlSeconds?: number;
  hotPath?: boolean;
}

export interface CacheResult<T> {
  status: "hit" | "miss" | "bypass";
  source?: "redis" | "postgres";
  response?: T;
  hash: StableHashResult;
  metadata?: {
    ttlRemainingSeconds?: number;
    createdAt?: string;
  };
}

export interface WithCacheParams<Request, Response> {
  orgId: string;
  version: string;
  request: Request;
  traceId?: string;
  control?: CacheControlOptions;
  compute: () => Promise<Response>;
}

interface RedisPayload<Response> {
  response: Response;
  created_at: string;
  ttl_at: string;
}

@Injectable()
export class PricingCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(PricingCacheService.name);
  private redisClientPromise: Promise<Redis> | null = null;
  private readonly enabled: boolean;
  private readonly dbFallbackEnabled: boolean;
  private readonly defaultTtl: number;
  private readonly hotPathTtl: number;
  private readonly lockTtl: number;

  constructor(
    private readonly config: ConfigService,
    private readonly repository: PricingCacheRepository,
  ) {
    this.enabled = this.getFlag("PRICING_CACHE_ENABLED", true);
    this.dbFallbackEnabled = this.getFlag("PRICING_CACHE_DB_FALLBACK_ENABLED", true);
    this.defaultTtl = this.getNumber("PRICING_CACHE_TTL_SECONDS", 604800);
    this.hotPathTtl = this.getNumber("PRICING_CACHE_HOT_TTL_SECONDS", 172800);
    this.lockTtl = this.getNumber("PRICING_CACHE_LOCK_TTL_SECONDS", 30);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClientPromise) {
      try {
        const client = await this.redisClientPromise;
        await client.quit();
      } catch (error) {
        this.logger.warn(`Failed to close Redis client: ${(error as Error).message}`);
      }
    }
  }

  async withCache<Request, Response>(params: WithCacheParams<Request, Response>): Promise<CacheResult<Response>> {
    const { orgId, version, request, compute, traceId, control } = params;
    const hash = computeStableHash(orgId, version, request);
    const cacheable = control?.cacheable !== false;

    if (!this.enabled || !cacheable) {
      const response = await compute();
      return {
        status: "bypass",
        response,
        hash,
      };
    }

    if (control?.bust) {
      const response = await compute();
      await this.persist(orgId, hash, version, request, response, { control, traceId });
      return {
        status: "miss",
        response,
        hash,
      };
    }

    if (control?.bypass) {
      const response = await compute();
      return {
        status: "bypass",
        response,
        hash,
      };
    }

    const cached = await this.lookup<Response>(orgId, hash, version, traceId);
    if (cached.status === "hit" && cached.response) {
      return cached;
    }

    const { token, acquired } = await this.acquireLock(hash.redisKey, traceId);
    try {
      if (!acquired) {
        // Wait for other worker to populate
        const waitResult = await this.waitForFill<Response>(orgId, hash, version, traceId);
        if (waitResult) {
          return waitResult;
        }
      }

      // Double-check cache after acquiring lock
      const secondCheck = await this.lookup<Response>(orgId, hash, version, traceId);
      if (secondCheck.status === "hit" && secondCheck.response) {
        return secondCheck;
      }

      const response = await compute();
      await this.persist(orgId, hash, version, request, response, { control, traceId });

      return {
        status: "miss",
        response,
        hash,
      };
    } finally {
      await this.releaseLock(hash.redisKey, token);
    }
  }

  private async lookup<Response>(
    orgId: string,
    hash: StableHashResult,
    version: string,
    traceId?: string,
  ): Promise<CacheResult<Response>> {
    if (!this.enabled) {
      return { status: "bypass", hash };
    }

    const redisHit = await this.getFromRedis<Response>(hash.redisKey, traceId);
    if (redisHit) {
  this.logEvent("log", "pricing_cache_hit", { source: "redis", key: hash.redisKey, traceId });
      return {
        status: "hit",
        source: "redis",
        response: redisHit.response,
        hash,
        metadata: {
          ttlRemainingSeconds: redisHit.ttlRemainingSeconds,
          createdAt: redisHit.createdAt,
        },
      };
    }

    if (!this.dbFallbackEnabled) {
      return { status: "miss", hash };
    }

    const record = await this.repository.find(orgId, hash.sha256Hex, version);
    if (!record) {
      return { status: "miss", hash };
    }

    if (this.isExpired(record.ttl_at)) {
      return { status: "miss", hash };
    }

    await this.repository.recordHit(record.id);

    const response = record.response_json as Response;
    await this.setRedis(hash.redisKey, {
      response,
      created_at: record.created_at,
      ttl_at: record.ttl_at,
    });

  this.logEvent("log", "pricing_cache_hit", { source: "postgres", key: hash.redisKey, traceId });

    return {
      status: "hit",
      source: "postgres",
      response,
      hash,
      metadata: {
        createdAt: record.created_at,
      },
    };
  }

  private async persist<Request, Response>(
    orgId: string,
    hash: StableHashResult,
    version: string,
    request: Request,
    response: Response,
    opts: { control?: CacheControlOptions; traceId?: string },
  ): Promise<void> {
    const ttlSeconds = this.resolveTtl(opts.control);
    const ttlAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const requestJson = this.cloneJson(request);
    const responseJson = this.cloneJson(response);

    await this.setRedis(hash.redisKey, {
      response: responseJson,
      created_at: new Date().toISOString(),
      ttl_at: ttlAt,
    }, ttlSeconds);

    const responseString = JSON.stringify(responseJson ?? null);
    const sizeBytes = Buffer.byteLength(responseString, "utf8");

    await this.repository.upsert({
      orgId,
      hash: hash.sha256Hex,
      version,
      requestJson,
      responseJson,
      ttlAt,
      sizeBytes,
    });

  this.logEvent("log", "pricing_cache_fill", { key: hash.redisKey, ttlSeconds, traceId: opts.traceId });
  }

  private resolveTtl(control?: CacheControlOptions): number {
    if (control?.ttlSeconds) {
      return control.ttlSeconds;
    }
    return control?.hotPath ? this.hotPathTtl : this.defaultTtl;
  }

  private async getRedisClient(): Promise<Redis> {
    if (!this.redisClientPromise) {
      const url = this.config.get<string>("REDIS_URL");
      this.redisClientPromise = Promise.resolve(new Redis(url ?? "redis://localhost:6379"));
    }
    return this.redisClientPromise;
  }

  private async getFromRedis<Response>(key: string, traceId?: string): Promise<{
    response: Response;
    createdAt: string;
    ttlRemainingSeconds?: number;
  } | null> {
    try {
      const client = await this.getRedisClient();
      const encoded = await client.getBuffer(key);
      if (!encoded) return null;
      const payload = this.decodeRedisPayload<Response>(encoded);

      const ttlRemaining = await client.ttl(key);

      return {
        response: payload.response,
        createdAt: payload.created_at,
        ttlRemainingSeconds: ttlRemaining > 0 ? ttlRemaining : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to read from Redis for key ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  private async setRedis<Response>(key: string, payload: RedisPayload<Response>, ttlSeconds?: number): Promise<void> {
    try {
      const client = await this.getRedisClient();
      const encoded = this.encodeRedisPayload(payload);
      const ttl = ttlSeconds ?? this.defaultTtl;
      const jitter = this.computeJitter(ttl);
      const finalTtl = Math.max(1, ttl + jitter);
      await client.set(key, encoded, "EX", finalTtl);
    } catch (error) {
      this.logger.error(`Failed to write pricing cache to Redis for key ${key}: ${(error as Error).message}`);
    }
  }

  private async waitForFill<Response>(
    orgId: string,
    hash: StableHashResult,
    version: string,
    traceId?: string,
  ): Promise<CacheResult<Response> | null> {
    const attempts = 30;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await this.sleep(this.randomBetween(25, 75));
      const result = await this.lookup<Response>(orgId, hash, version, traceId);
      if (result.status === "hit") {
        return result;
      }
    }
    this.logEvent("warn", "pricing_cache_lock_contention", { key: hash.redisKey, traceId });
    return null;
  }

  private async acquireLock(key: string, traceId?: string): Promise<{ token: string; acquired: boolean }> {
    const client = await this.getRedisClient();
    const token = randomUUID();
    const lockKey = this.toLockKey(key);
    const ttlMs = this.lockTtl * 1000;

    const start = Date.now();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const acquired = await client.set(lockKey, token, "PX", ttlMs, "NX");
      if (acquired) {
        const waited = Date.now() - start;
        if (attempt > 0) {
          this.logEvent("warn", "pricing_cache_lock_wait", { key, attempts: attempt + 1, wait_ms: waited, traceId });
        }
        return { token, acquired: true };
      }

      await this.sleep(this.randomBetween(25, 75));
    }

    this.logEvent("warn", "pricing_cache_lock_timeout", { key, traceId });
    return { token, acquired: false };
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    try {
      const client = await this.getRedisClient();
      await client.eval(LOCK_RELEASE_SCRIPT, 1, this.toLockKey(key), token);
    } catch (error) {
      this.logger.warn(`Failed to release cache lock for key ${key}: ${(error as Error).message}`);
    }
  }

  private toLockKey(key: string): string {
    return key.replace("pc:", "pc:lock:");
  }

  private encodeRedisPayload<Response>(payload: RedisPayload<Response>): Buffer {
    const json = JSON.stringify(payload);
    return gzipSync(Buffer.from(json, "utf8"));
  }

  private decodeRedisPayload<Response>(encoded: Buffer): RedisPayload<Response> {
    const json = gunzipSync(encoded).toString("utf8");
    return JSON.parse(json) as RedisPayload<Response>;
  }

  private isExpired(ttlAt: string): boolean {
    return new Date(ttlAt).getTime() <= Date.now();
  }

  private computeJitter(ttlSeconds: number): number {
    const jitterRange = ttlSeconds * 0.1;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    return Math.round(jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private logEvent(level: "log" | "warn" | "error", event: string, details: Record<string, unknown>): void {
    const message = `${event} ${JSON.stringify(details)}`;
    if (level === "log") {
      this.logger.log(message);
    } else if (level === "warn") {
      this.logger.warn(message);
    } else {
      this.logger.error(message);
    }
  }

  private cloneJson<T>(value: T): T {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  }

  private getFlag(key: string, defaultValue: boolean): boolean {
    const raw = this.config.get<string>(key);
    if (raw === undefined || raw === null) return defaultValue;
    return !["false", "0", "off"].includes(String(raw).toLowerCase());
  }

  private getNumber(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    if (raw === undefined || raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
