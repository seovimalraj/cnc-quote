import { Store } from "cache-manager";
import { RedisStore } from "cache-manager-redis-store";

export interface RedisCache extends Cache {
  store: RedisStore;
}

export interface RedisStore extends Store {
  keys(): Promise<string[]>;
}
