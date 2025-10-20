import { PricingConfigService } from './pricing-config.service';
import { ConfigWithMetadata } from '../admin-pricing/admin-pricing.service';
import type { AdminPricingConfig } from '@cnc-quote/shared';

const { describe, it, expect, beforeEach } = globalThis as Record<string, any>;

class MockCacheService {
  private readonly store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const makeConfig = (version: string): AdminPricingConfig => ({
  version,
  machines: {
    primary: {
      hourly_rate: 75,
      setup_rate: 80,
      min_setup_min: 30,
      feed_rate_map: { aluminum: 800 },
    },
  },
  materials: {
    aluminum: {
      grade: '6061',
      density_kg_m3: 2700,
      buy_price: 2.5,
      stock_forms: ['plate'],
      waste_factor_percent: 10,
      finish_compat: ['anodize'],
      min_wall_mm: 1.5,
      min_hole_mm: 3,
      machinability: 0.8,
    },
  },
  finishes: {
    anodize: {
      model: 'per_area',
      rate: 0.1,
      min_lot: 10,
      capacity_dims: { max_area: 1000 },
      leadtime_add: 2,
      region_allowed: ['USA'],
    },
  },
  tolerance_packs: {
    standard: {
      cycle_time_multiplier: 1,
      surface_default: 125,
      inspection_requirements: 'basic',
    },
  },
  inspection: {
    base_usd: 25,
    per_dim_usd: 5,
    program_min: 30,
  },
  speed_region: {
    USA: {
      Standard: { multiplier: 1, leadtime_days: 4 },
    },
  },
  risk_matrix: {
    thin_wall: { time_multiplier: 1.1, risk_percent: 5 },
  },
  overhead_margin: {
    overhead_percent: 25,
    target_margin_percent: 35,
  },
});

class MockAdminPricingService {
  runtimeCalls = 0;
  previewCalls = 0;
  throwRuntime = false;
  throwPreview = false;

  runtimeSnapshot: ConfigWithMetadata;
  previewSnapshot: ConfigWithMetadata;
  defaultSnapshot: ConfigWithMetadata;

  constructor() {
    this.runtimeSnapshot = {
      config: makeConfig('v-published'),
      status: 'published',
      version: 'v-published',
    };
    this.previewSnapshot = {
      config: makeConfig('v-draft'),
      status: 'draft',
      version: 'v-draft',
    };
    this.defaultSnapshot = {
      config: makeConfig('v-default'),
      status: 'default',
      version: 'v-default',
    };
  }

  async getRuntimeConfig(): Promise<ConfigWithMetadata> {
    this.runtimeCalls += 1;
    if (this.throwRuntime) {
      throw new Error('runtime unavailable');
    }
    return this.runtimeSnapshot;
  }

  async getConfig(): Promise<ConfigWithMetadata> {
    this.previewCalls += 1;
    if (this.throwPreview) {
      throw new Error('preview unavailable');
    }
    return this.previewSnapshot;
  }

  getDefaultSnapshot(): ConfigWithMetadata {
    return this.defaultSnapshot;
  }
}

describe('PricingConfigService', () => {
  let cache: MockCacheService;
  let admin: MockAdminPricingService;
  let service: PricingConfigService;

  beforeEach(() => {
    cache = new MockCacheService();
    admin = new MockAdminPricingService();
    service = new PricingConfigService(admin as any, cache as any);
  });

  it('returns active config from cache after initial hydrate', async () => {
    const first = await service.getActiveConfig();
    const second = await service.getActiveConfig();

    expect(first.version).toBe('v-published');
    expect(second.version).toBe('v-published');
    expect(admin.runtimeCalls).toBe(1);
  });

  it('falls back to default snapshot when runtime fetch fails', async () => {
    admin.throwRuntime = true;

    const fallback = await service.getActiveConfig();
    const repeat = await service.getActiveConfig();

    expect(fallback.version).toBe('v-default');
    expect(repeat.version).toBe('v-default');
    expect(admin.runtimeCalls).toBe(1);
  });

  it('returns draft snapshot for preview calls and caches result', async () => {
    const first = await service.getPreviewConfig();
    const second = await service.getPreviewConfig();

    expect(first.status).toBe('draft');
    expect(second.status).toBe('draft');
    expect(admin.previewCalls).toBe(1);
  });

  it('falls back to active config when preview fetch fails', async () => {
    admin.throwPreview = true;

    const first = await service.getPreviewConfig();
    const second = await service.getPreviewConfig();

    expect(first.status).toBe('published');
    expect(second.status).toBe('published');
    expect(admin.runtimeCalls).toBe(1);
    expect(admin.previewCalls).toBe(2);
  });

  it('clears both caches when invalidating runtime cache', async () => {
    await service.getActiveConfig();
    await service.getPreviewConfig();

    admin.runtimeSnapshot = {
      config: makeConfig('v-published-2'),
      status: 'published',
      version: 'v-published-2',
    };
    admin.previewSnapshot = {
      config: makeConfig('v-draft-2'),
      status: 'draft',
      version: 'v-draft-2',
    };

    await service.invalidateRuntimeCache();

    const refreshedActive = await service.getActiveConfig();
    const refreshedPreview = await service.getPreviewConfig();

    expect(refreshedActive.version).toBe('v-published-2');
    expect(refreshedPreview.version).toBe('v-draft-2');
    expect(admin.runtimeCalls).toBeGreaterThan(1);
    expect(admin.previewCalls).toBeGreaterThan(1);
  });
});
