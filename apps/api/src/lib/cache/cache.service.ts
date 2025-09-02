import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { RedisCache } from "./cache.types";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private redisCache: RedisCache;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    this.redisCache = cacheManager as RedisCache;
  }

  async onModuleDestroy() {
    await this.redisCache.store.client.quit();
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    try {
      if (this.redisCache.store) {
        await this.redisCache.store.reset();
      } else {
        throw new Error("Cache store is not initialized");
      }
    } catch (error) {
      console.error("Failed to reset cache:", error);
      throw error;
    }
  }

  async keys(pattern = "*"): Promise<string[]> {
    if (this.redisCache.store) {
      return this.redisCache.store.keys(pattern);
    }
    throw new Error("Cache store is not initialized");
  }
}
