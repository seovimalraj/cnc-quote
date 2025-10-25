import { Injectable, Logger } from '@nestjs/common';
import { AdminPricingService, ConfigWithMetadata } from './admin-pricing.service';
import { CacheService } from "../../../lib/cache/cache.service";
import {
  ACTIVE_PRICING_CONFIG_CACHE_KEY,
  ACTIVE_PRICING_CONFIG_TTL_SECONDS,
  PREVIEW_PRICING_CONFIG_CACHE_KEY,
  PREVIEW_PRICING_CONFIG_TTL_SECONDS,
} from './pricing-config.constants';

@Injectable()
export class PricingConfigService {
  private readonly logger = new Logger(PricingConfigService.name);

  constructor(
    private readonly adminPricing: AdminPricingService,
    private readonly cache: CacheService,
  ) {}

  async getActiveConfig(): Promise<ConfigWithMetadata> {
    const cached = await this.cache.get<ConfigWithMetadata>(ACTIVE_PRICING_CONFIG_CACHE_KEY);
    if (cached) {
      return cached;
    }

    let snapshot: ConfigWithMetadata;
    try {
      snapshot = await this.adminPricing.getRuntimeConfig();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to load published pricing config; falling back to default. Reason=${message}`);
      snapshot = this.adminPricing.getDefaultSnapshot();
    }

    await this.cache.set(ACTIVE_PRICING_CONFIG_CACHE_KEY, snapshot, ACTIVE_PRICING_CONFIG_TTL_SECONDS);
    return snapshot;
  }

  async getPreviewConfig(): Promise<ConfigWithMetadata> {
    const cached = await this.cache.get<ConfigWithMetadata>(PREVIEW_PRICING_CONFIG_CACHE_KEY);
    if (cached) {
      return cached;
    }

    try {
      const snapshot = await this.adminPricing.getConfig();
      await this.cache.set(PREVIEW_PRICING_CONFIG_CACHE_KEY, snapshot, PREVIEW_PRICING_CONFIG_TTL_SECONDS);
      return snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to load preview pricing config; falling back to active. Reason=${message}`);
      return this.getActiveConfig();
    }
  }

  async invalidateRuntimeCache(): Promise<void> {
    try {
      await this.cache.del(ACTIVE_PRICING_CONFIG_CACHE_KEY);
      await this.cache.del(PREVIEW_PRICING_CONFIG_CACHE_KEY);
    } catch (error) {
      this.logger.warn(`Failed to invalidate pricing config cache: ${(error as Error).message}`);
    }
  }
}
