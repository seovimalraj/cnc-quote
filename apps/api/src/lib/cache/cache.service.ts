import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

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
      const cacheStore = (this.cacheManager as any).store;
      if (cacheStore && typeof cacheStore.keys === "function") {
        const keys = await cacheStore.keys();
        await Promise.all(keys.map((key) => this.cacheManager.del(key)));
      } else {
        throw new Error("Cache store does not support key listing");
      }
    } catch (error) {
      console.error("Failed to reset cache:", error);
      throw error;
    }
  }
}
