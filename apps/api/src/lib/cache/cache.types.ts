import { Cache } from "cache-manager";
import type { RedisClientType } from "@redis/client";

export type RedisClient = RedisClientType;

export interface RedisCache extends Cache {
  store: RedisClientStore;
}

export interface RedisClientStore {
  client: RedisClient;
  options: any; // RedisClientOptions;
  name: string;
  getClient(): Promise<RedisClient>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  del(key: string): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  reset(): Promise<void>;
}
