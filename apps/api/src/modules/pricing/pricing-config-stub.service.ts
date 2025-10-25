import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../lib/cache/cache.service';
import { ConfigWithMetadata } from '../admin-pricing/admin-pricing.service';
import {
  ACTIVE_PRICING_CONFIG_CACHE_KEY,
  PREVIEW_PRICING_CONFIG_CACHE_KEY,
} from './pricing-config.constants';

/**
 * Minimal PricingConfigService for deployment without AdminPricingModule.
 * Returns hardcoded default config until admin features are enabled.
 */
@Injectable()
export class PricingConfigStubService {
  private readonly logger = new Logger('PricingConfigService');

  constructor(private readonly cache: CacheService) {}

  async getActiveConfig(): Promise<ConfigWithMetadata> {
    const cached = await this.cache.get<ConfigWithMetadata>(ACTIVE_PRICING_CONFIG_CACHE_KEY);
    if (cached) {
      return cached;
    }

    // Return minimal default config for instant quote
    const defaultConfig = {
      config: {
        complexity_tiers: [],
        base_rates: {
          milling: 120,
          turning: 100,
          sheet_metal: 80,
        },
        tolerance_premiums: {},
        feature_costs: {},
      },
      metadata: {
        version: 1,
        published_at: new Date().toISOString(),
        published_by: 'system',
        is_active: true,
      },
    } as any as ConfigWithMetadata;

    await this.cache.set(
      ACTIVE_PRICING_CONFIG_CACHE_KEY,
      defaultConfig,
      3600,
    );

    return defaultConfig;
  }

  async getPreviewConfig(): Promise<ConfigWithMetadata | null> {
    return await this.cache.get<ConfigWithMetadata>(PREVIEW_PRICING_CONFIG_CACHE_KEY);
  }

  async clearCache(): Promise<void> {
    await Promise.all([
      this.cache.del(ACTIVE_PRICING_CONFIG_CACHE_KEY),
      this.cache.del(PREVIEW_PRICING_CONFIG_CACHE_KEY),
    ]);
    this.logger.log('Pricing config cache cleared');
  }
}
