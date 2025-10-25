import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  conditions: {
    user_roles?: string[];
    user_ids?: string[];
    organizations?: string[];
    environments?: string[];
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface FeatureFlagEvaluation {
  flag_key: string;
  enabled: boolean;
  rollout_percentage: number;
  user_in_rollout: boolean;
  conditions_met: boolean;
  reason: string;
}

@Injectable()
export class AdminFeatureFlagsService {
  private readonly logger = new Logger(AdminFeatureFlagsService.name);

  private readonly tenantScopedFlags = new Set<string>([
    'admin_pricing_revision_assistant',
    'pricing_compliance_ml_assist',
    'pricing_quote_rationale',
  ]);

  // Default feature flags
  private readonly defaultFlags: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>[] = [
    {
      name: 'Advanced DFM Analysis',
      key: 'advanced_dfm',
      description: 'Enable advanced design for manufacturability analysis with AI-powered suggestions',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
    {
      name: 'Bulk Quote Processing',
      key: 'bulk_quotes',
      description: 'Allow processing multiple quotes simultaneously',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
    {
      name: 'Real-time Collaboration',
      key: 'realtime_collab',
      description: 'Enable real-time collaboration features for quotes',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
    {
      name: 'Advanced Analytics Dashboard',
      key: 'analytics_dashboard',
      description: 'Enhanced analytics and reporting dashboard',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
    {
      name: 'API Rate Limiting',
      key: 'api_rate_limiting',
      description: 'Advanced API rate limiting and throttling',
      enabled: true,
      rollout_percentage: 100,
      conditions: {},
    },
    {
      name: 'Webhook Notifications',
      key: 'webhook_notifications',
      description: 'Real-time webhook notifications for quote updates',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
    {
      name: 'Pricing Compliance ML Assist',
      key: 'pricing_compliance_ml_assist',
      description: 'Generate AI-assisted rationales for critical pricing compliance alerts',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
    {
      name: 'Pricing Quote Rationale Summaries',
      key: 'pricing_quote_rationale',
      description: 'Translate deterministic cost sheets into advisory explanations for customers',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
    {
      name: 'Admin Pricing Revision Assistant',
      key: 'admin_pricing_revision_assistant',
      description: 'Generate AI-assisted drafts for pricing configuration revisions with approval workflow separation',
      enabled: false,
      rollout_percentage: 0,
      conditions: {},
    },
  ];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get feature flags', error);
        return [];
      }

      // If no flags exist, initialize with defaults
      if (!data || data.length === 0) {
        return this.initializeDefaultFlags();
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get feature flags', error);
      return [];
    }
  }

  async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<FeatureFlag> {
    try {
      const { data, error } = await this.supabase.client
        .from('feature_flags')
        .insert({
          ...flag,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create feature flag', error);
        throw new BadRequestException('Failed to create feature flag');
      }

      // Clear cache
      await this.cache.del('feature_flags');

      return data;
    } catch (error) {
      this.logger.error('Failed to create feature flag', error);
      throw error;
    }
  }

  async updateFeatureFlag(flagId: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    try {
      const { data, error } = await this.supabase.client
        .from('feature_flags')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flagId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update feature flag', error);
        throw new BadRequestException('Failed to update feature flag');
      }

      // Clear cache
      await this.cache.del('feature_flags');

      return data;
    } catch (error) {
      this.logger.error('Failed to update feature flag', error);
      throw error;
    }
  }

  async deleteFeatureFlag(flagId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('feature_flags')
        .delete()
        .eq('id', flagId);

      if (error) {
        this.logger.error('Failed to delete feature flag', error);
        throw new BadRequestException('Failed to delete feature flag');
      }

      // Clear cache
      await this.cache.del('feature_flags');
    } catch (error) {
      this.logger.error('Failed to delete feature flag', error);
      throw error;
    }
  }

  async evaluateFeatureFlag(
    flagKey: string,
    context: {
      user_id?: string;
      user_role?: string;
      organization_id?: string;
      environment?: string;
    },
  ): Promise<FeatureFlagEvaluation> {
    try {
      const { data: flag, error } = await this.supabase.client
        .from('feature_flags')
        .select('*')
        .eq('key', flagKey)
        .single();

      if (error || !flag) {
        return {
          flag_key: flagKey,
          enabled: false,
          rollout_percentage: 0,
          user_in_rollout: false,
          conditions_met: false,
          reason: 'Feature flag not found',
        };
      }

      const isTenantScoped = this.tenantScopedFlags.has(flagKey);

      if (isTenantScoped && !context.organization_id) {
        return {
          flag_key: flagKey,
          enabled: false,
          rollout_percentage: flag.rollout_percentage,
          user_in_rollout: false,
          conditions_met: false,
          reason: 'Tenant context required',
        };
      }

      // Check if flag is globally disabled
      if (!flag.enabled) {
        return {
          flag_key: flagKey,
          enabled: false,
          rollout_percentage: flag.rollout_percentage,
          user_in_rollout: false,
          conditions_met: false,
          reason: 'Feature flag is disabled',
        };
      }

      // Check conditions
      const conditionsMet = this.checkConditions(flag.conditions, context, isTenantScoped);

      if (!conditionsMet) {
        return {
          flag_key: flagKey,
          enabled: false,
          rollout_percentage: flag.rollout_percentage,
          user_in_rollout: false,
          conditions_met: false,
          reason: 'Conditions not met',
        };
      }

      // Check rollout percentage
      const userInRollout = this.checkRolloutPercentage(flag.rollout_percentage, context.user_id);

      return {
        flag_key: flagKey,
        enabled: userInRollout,
        rollout_percentage: flag.rollout_percentage,
        user_in_rollout: userInRollout,
        conditions_met: true,
        reason: userInRollout ? 'Enabled for user' : 'User not in rollout',
      };
    } catch (error) {
      this.logger.error('Failed to evaluate feature flag', error);
      return {
        flag_key: flagKey,
        enabled: false,
        rollout_percentage: 0,
        user_in_rollout: false,
        conditions_met: false,
        reason: 'Evaluation failed',
      };
    }
  }

  async getFeatureFlagsForUser(
    context: {
      user_id?: string;
      user_role?: string;
      organization_id?: string;
      environment?: string;
    },
  ): Promise<Record<string, boolean>> {
    try {
      const flags = await this.getFeatureFlags();
      const result: Record<string, boolean> = {};

      for (const flag of flags) {
        const evaluation = await this.evaluateFeatureFlag(flag.key, context);
        result[flag.key] = evaluation.enabled;
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get feature flags for user', error);
      return {};
    }
  }

  async toggleFeatureFlag(flagId: string, enabled: boolean, updatedBy: string): Promise<FeatureFlag> {
    return this.updateFeatureFlag(flagId, { enabled, updated_by: updatedBy });
  }

  async updateRolloutPercentage(flagId: string, percentage: number, updatedBy: string): Promise<FeatureFlag> {
    if (percentage < 0 || percentage > 100) {
      throw new BadRequestException('Rollout percentage must be between 0 and 100');
    }

    return this.updateFeatureFlag(flagId, {
      rollout_percentage: percentage,
      updated_by: updatedBy,
    });
  }

  private async initializeDefaultFlags(): Promise<FeatureFlag[]> {
    try {
      const flags: FeatureFlag[] = [];

      for (const defaultFlag of this.defaultFlags) {
        const { data, error } = await this.supabase.client
          .from('feature_flags')
          .insert({
            ...defaultFlag,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'system',
            updated_by: 'system',
          })
          .select()
          .single();

        if (error) {
          this.logger.error(`Failed to create default flag ${defaultFlag.key}`, error);
          continue;
        }

        flags.push(data);
      }

      return flags;
    } catch (error) {
      this.logger.error('Failed to initialize default flags', error);
      return [];
    }
  }

  private checkConditions(
    conditions: FeatureFlag['conditions'],
    context: {
      user_id?: string;
      user_role?: string;
      organization_id?: string;
      environment?: string;
    },
    tenantScoped: boolean,
  ): boolean {
    // Check user roles
    if (conditions.user_roles && conditions.user_roles.length > 0) {
      if (!context.user_role || !conditions.user_roles.includes(context.user_role)) {
        return false;
      }
    }

    // Check user IDs
    if (conditions.user_ids && conditions.user_ids.length > 0) {
      if (!context.user_id || !conditions.user_ids.includes(context.user_id)) {
        return false;
      }
    }

    // Check organizations
    if (conditions.organizations && conditions.organizations.length > 0) {
      if (!context.organization_id || !conditions.organizations.includes(context.organization_id)) {
        return false;
      }
    } else if (tenantScoped) {
      // Tenant-scoped flags must explicitly enumerate allowed organizations
      return false;
    }

    // Check environments
    if (conditions.environments && conditions.environments.length > 0) {
      if (!context.environment || !conditions.environments.includes(context.environment)) {
        return false;
      }
    }

    return true;
  }

  private checkRolloutPercentage(percentage: number, userId?: string): boolean {
    if (percentage >= 100) {
      return true;
    }

    if (percentage <= 0) {
      return false;
    }

    if (!userId) {
      return false;
    }

    // Use user ID hash for consistent rollout
    const hash = this.hashString(userId);
    const normalizedHash = (hash % 100) / 100;

    return normalizedHash < (percentage / 100);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
