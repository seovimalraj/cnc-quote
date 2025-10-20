import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';
import {
  AdminPricingConfig,
  AdminPricingConfigSchema,
} from '@cnc-quote/shared';
import fallbackConfig from './default-config.json';
import {
  ACTIVE_PRICING_CONFIG_CACHE_KEY,
  PREVIEW_PRICING_CONFIG_CACHE_KEY,
} from '../pricing/pricing-config.constants';

interface PricingConfigRecord {
  id: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  config: AdminPricingConfig;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  published_at?: string;
  published_by?: string;
}

export interface ConfigWithMetadata {
  config: AdminPricingConfig;
  status: 'draft' | 'published' | 'default';
  version: string;
  sourceId?: string;
  updated_at?: string;
  published_at?: string;
}

@Injectable()
export class AdminPricingService {
  private readonly logger = new Logger(AdminPricingService.name);
  private readonly defaultConfig: AdminPricingConfig;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {
    const parsed = AdminPricingConfigSchema.safeParse(fallbackConfig);
    if (!parsed.success) {
      throw new Error('Default pricing config failed validation');
    }
    this.defaultConfig = parsed.data;
  }

  async getConfig(): Promise<ConfigWithMetadata> {
    const draft = await this.fetchLatestByStatus('draft');
    if (draft) {
      return this.toMetadata(draft.config, {
        status: 'draft',
        version: draft.version,
        sourceId: draft.id,
        updated_at: draft.updated_at,
      });
    }

    const published = await this.fetchLatestByStatus('published');
    if (published) {
      return this.toMetadata(published.config, {
        status: 'published',
        version: published.version,
        sourceId: published.id,
        updated_at: published.updated_at,
        published_at: published.published_at,
      });
    }

    return this.getDefaultSnapshot();
  }

  async saveDraft(config: AdminPricingConfig, userId?: string, draftId?: string): Promise<ConfigWithMetadata> {
    const parsed = this.ensureValidConfig(config);
    const timestamp = new Date().toISOString();

    if (draftId) {
      const { error } = await this.supabase.client
        .from('admin_pricing_configs')
        .update({
          config: parsed,
          version: parsed.version,
          status: 'draft',
          updated_at: timestamp,
          updated_by: userId ?? null,
        })
        .eq('id', draftId);

      if (error) {
        this.logger.error('Failed to update draft pricing config', error);
        throw new Error(error.message ?? 'Failed to update draft pricing config');
      }

      return this.toMetadata(parsed, {
        status: 'draft',
        version: parsed.version,
        sourceId: draftId,
        updated_at: timestamp,
      });
    }

    const existingDraft = await this.fetchLatestByStatus('draft');
    if (existingDraft) {
      const { error } = await this.supabase.client
        .from('admin_pricing_configs')
        .update({
          config: parsed,
          version: parsed.version,
          status: 'draft',
          updated_at: timestamp,
          updated_by: userId ?? null,
        })
        .eq('id', existingDraft.id);

      if (error) {
        this.logger.error('Failed to update existing draft pricing config', error);
        throw new Error(error.message ?? 'Failed to update existing draft pricing config');
      }

      return this.toMetadata(parsed, {
        status: 'draft',
        version: parsed.version,
        sourceId: existingDraft.id,
        updated_at: timestamp,
      });
    }

    const { data, error } = await this.supabase.client
      .from('admin_pricing_configs')
      .insert({
        config: parsed,
        version: parsed.version,
        status: 'draft',
        created_by: userId ?? null,
        updated_by: userId ?? null,
        updated_at: timestamp,
      })
      .select()
      .limit(1);

    if (error) {
      this.logger.error('Failed to insert draft pricing config', error);
      throw new Error(error.message ?? 'Failed to insert draft pricing config');
    }

    const record = data?.[0];
    return this.toMetadata(parsed, {
      status: 'draft',
      version: parsed.version,
      sourceId: record?.id,
      updated_at: timestamp,
    });
  }

  async publishConfig(config: AdminPricingConfig, userId?: string): Promise<ConfigWithMetadata> {
    const parsed = this.ensureValidConfig(config);
    const latestPublished = await this.fetchLatestByStatus('published');
    const nextVersion = this.bumpVersion(latestPublished?.version ?? parsed.version);
    const timestamp = new Date().toISOString();
    const configWithVersion = { ...parsed, version: nextVersion };

    const { data, error } = await this.supabase.client
      .from('admin_pricing_configs')
      .insert({
        config: configWithVersion,
        version: nextVersion,
        status: 'published',
        created_by: userId ?? null,
        updated_by: userId ?? null,
        published_by: userId ?? null,
        published_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .limit(1);

    if (error) {
      this.logger.error('Failed to publish pricing config', error);
      throw new Error(error.message ?? 'Failed to publish pricing config');
    }

    const record = data?.[0];

    // Ensure draft mirrors latest published version for continuity
    await this.saveDraft(configWithVersion, userId, (await this.fetchLatestByStatus('draft'))?.id);

    await this.invalidateRuntimeCache();

    return this.toMetadata(configWithVersion, {
      status: 'published',
      version: nextVersion,
      sourceId: record?.id,
      updated_at: timestamp,
      published_at: timestamp,
    });
  }

  async getRuntimeConfig(): Promise<ConfigWithMetadata> {
    const published = await this.fetchLatestByStatus('published');
    if (published) {
      return this.toMetadata(published.config, {
        status: 'published',
        version: published.version,
        sourceId: published.id,
        updated_at: published.updated_at,
        published_at: published.published_at,
      });
    }

    this.logger.warn('No published pricing config available; falling back to default snapshot');
    return this.getDefaultSnapshot();
  }

  getDefaultSnapshot(): ConfigWithMetadata {
    return {
      config: this.defaultConfig,
      status: 'default',
      version: this.defaultConfig.version,
    };
  }

  private ensureValidConfig(config: AdminPricingConfig): AdminPricingConfig {
    const result = AdminPricingConfigSchema.safeParse(config);
    if (!result.success) {
      this.logger.error('Pricing config validation failed', result.error.flatten());
      throw new Error('Invalid pricing config payload');
    }
    return result.data;
  }

  private async fetchLatestByStatus(status: 'draft' | 'published' | 'archived') {
    const { data, error } = await this.supabase.client
      .from('admin_pricing_configs')
      .select('*')
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      this.logger.error(`Failed to fetch ${status} pricing config`, error);
      throw new Error(error.message ?? `Failed to fetch ${status} pricing config`);
    }

    const record = data?.[0] as PricingConfigRecord | undefined;
    if (!record) {
      return undefined;
    }

    try {
      const parsed = this.ensureValidConfig(record.config);
      return { ...record, config: parsed } satisfies PricingConfigRecord;
    } catch (parseError) {
      this.logger.error(`Stored ${status} pricing config failed validation`, parseError as Error);
      return undefined;
    }
  }

  private bumpVersion(currentVersion: string): string {
    const normalized = currentVersion?.startsWith('v') ? currentVersion.slice(1) : currentVersion;
    const parts = normalized.split('.').map((part) => Number.parseInt(part, 10));

    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      parts[2] += 1;
      return `v${parts[0]}.${parts[1]}.${parts[2]}`;
    }

    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12);
    return `v${timestamp}`;
  }

  private toMetadata(
    config: AdminPricingConfig,
    meta: {
      status: 'draft' | 'published' | 'default';
      version: string;
      sourceId?: string;
      updated_at?: string;
      published_at?: string;
    },
  ): ConfigWithMetadata {
    return {
      config,
      status: meta.status,
      version: meta.version,
      sourceId: meta.sourceId,
      updated_at: meta.updated_at,
      published_at: meta.published_at,
    };
  }

  private async invalidateRuntimeCache(): Promise<void> {
    try {
      await this.cache.del(ACTIVE_PRICING_CONFIG_CACHE_KEY);
      await this.cache.del(PREVIEW_PRICING_CONFIG_CACHE_KEY);
    } catch (error) {
      this.logger.warn(`Failed to invalidate runtime pricing config cache: ${(error as Error).message}`);
    }
  }
}
