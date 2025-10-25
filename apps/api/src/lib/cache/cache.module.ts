import { Module, Global, OnModuleDestroy, Inject } from "@nestjs/common";
import { CacheModule as NestCacheModule, CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { createClient } from "redis";
import { CacheService } from "./cache.service";
import { RedisClientStore, RedisCache, RedisClient } from "./cache.types";

const createRedisStore = async (config: ConfigService): Promise<RedisClientStore> => {
  const client = createClient({
    socket: {
      host: config.get("REDIS_HOST"),
      port: config.get<number>("REDIS_PORT"),
    },
    password: config.get("REDIS_PASSWORD"),
  }) as RedisClient;

  await client.connect();

  return {
    client,
    options: client.options,
    name: "redis",
    getClient: async () => client,
    set: async <T>(key: string, value: T, ttl?: number) => {
      await client.set(key, JSON.stringify(value), ttl ? { EX: ttl } : {});
    },
    get: async <T>(key: string): Promise<T | undefined> => {
      const value = await client.get(key);
      if (!value) return undefined;
      try {
        return JSON.parse(value as string) as T;
      } catch {
        return undefined;
      }
    },
    del: async (key: string) => {
      await client.del(key);
    },
    keys: async (pattern = "*") => {
      const keys = await client.keys(pattern);
      return keys.map((key) => key.toString());
    },
    ttl: async (key: string) => {
      const ttl = await client.ttl(key);
      return typeof ttl === "string" ? parseInt(ttl, 10) : ttl;
    },
    reset: async () => {
      await client.flushDb();
    },
  };
};

// @Global() // REMOVED: Causes double instantiation and "metatype is not a constructor" error
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        store: await createRedisStore(configService),
        ttl: 60 * 60, // 1 hour default TTL
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule implements OnModuleDestroy {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: RedisCache) {}

  async onModuleDestroy() {
    await this.cacheManager.store.client.quit();
  }
}
