import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { createHash } from 'crypto';

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  rate_limit: number;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  created_by: string;
  revoked: boolean;
  revoked_at?: string;
  revoked_by?: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  secret_key: string;
}

export interface EmbeddingConfig {
  id: string;
  name: string;
  allowed_domains: string[];
  rate_limit: number;
  features: string[];
  css_customization: string;
  javascript_customization: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ApiUsageStats {
  total_requests: number;
  requests_today: number;
  requests_this_month: number;
  rate_limit_hits: number;
  average_response_time: number;
  error_rate: number;
}

@Injectable()
export class AdminApiKeysService {
  private readonly logger = new Logger(AdminApiKeysService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async generateApiKey(name: string, permissions: string[], rateLimit: number, expiresAt: string | null, createdBy: string): Promise<ApiKeyWithSecret> {
    try {
      // Generate a secure random API key
      const secretKey = this.generateSecureKey();
      const keyHash = this.hashApiKey(secretKey);

      const { data, error } = await this.supabase.client
        .from('api_keys')
        .insert({
          name,
          key_hash: keyHash,
          permissions,
          rate_limit: rateLimit,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          created_by: createdBy,
          revoked: false,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to generate API key', error);
        throw new BadRequestException('Failed to generate API key');
      }

      return {
        ...data,
        secret_key: secretKey,
      };
    } catch (error) {
      this.logger.error('Failed to generate API key', error);
      throw error;
    }
  }

  async getApiKeys(): Promise<ApiKey[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get API keys', error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get API keys', error);
      return [];
    }
  }

  async revokeApiKey(keyId: string, revokedBy: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('api_keys')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_by: revokedBy,
        })
        .eq('id', keyId);

      if (error) {
        this.logger.error('Failed to revoke API key', error);
        throw new BadRequestException('Failed to revoke API key');
      }

      // Clear cache
      await this.cache.del(`api_key_${keyId}`);
    } catch (error) {
      this.logger.error('Failed to revoke API key', error);
      throw error;
    }
  }

  async validateApiKey(secretKey: string): Promise<{ valid: boolean; key?: ApiKey; permissions?: string[] }> {
    try {
      const keyHash = this.hashApiKey(secretKey);

      const { data, error } = await this.supabase.client
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('revoked', false)
        .single();

      if (error || !data) {
        return { valid: false };
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false };
      }

      // Update last used
      await this.supabase.client
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return {
        valid: true,
        key: data,
        permissions: data.permissions,
      };
    } catch (error) {
      this.logger.error('Failed to validate API key', error);
      return { valid: false };
    }
  }

  async updateApiKeyPermissions(keyId: string, permissions: string[], updatedBy: string): Promise<ApiKey> {
    try {
      const { data, error } = await this.supabase.client
        .from('api_keys')
        .update({
          permissions,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq('id', keyId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update API key permissions', error);
        throw new BadRequestException('Failed to update API key permissions');
      }

      // Clear cache
      await this.cache.del(`api_key_${keyId}`);

      return data;
    } catch (error) {
      this.logger.error('Failed to update API key permissions', error);
      throw error;
    }
  }

  async getEmbeddingConfigs(): Promise<EmbeddingConfig[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('embedding_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get embedding configs', error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get embedding configs', error);
      return [];
    }
  }

  async createEmbeddingConfig(
    name: string,
    allowedDomains: string[],
    rateLimit: number,
    features: string[],
    cssCustomization: string,
    jsCustomization: string,
    createdBy: string,
  ): Promise<EmbeddingConfig> {
    try {
      const { data, error } = await this.supabase.client
        .from('embedding_configs')
        .insert({
          name,
          allowed_domains: allowedDomains,
          rate_limit: rateLimit,
          features,
          css_customization: cssCustomization,
          javascript_customization: jsCustomization,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: createdBy,
          updated_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create embedding config', error);
        throw new BadRequestException('Failed to create embedding config');
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to create embedding config', error);
      throw error;
    }
  }

  async updateEmbeddingConfig(
    configId: string,
    updates: Partial<EmbeddingConfig>,
    updatedBy: string,
  ): Promise<EmbeddingConfig> {
    try {
      const { data, error } = await this.supabase.client
        .from('embedding_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq('id', configId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update embedding config', error);
        throw new BadRequestException('Failed to update embedding config');
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to update embedding config', error);
      throw error;
    }
  }

  async deleteEmbeddingConfig(configId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('embedding_configs')
        .delete()
        .eq('id', configId);

      if (error) {
        this.logger.error('Failed to delete embedding config', error);
        throw new BadRequestException('Failed to delete embedding config');
      }
    } catch (error) {
      this.logger.error('Failed to delete embedding config', error);
      throw error;
    }
  }

  async getApiUsageStats(keyId?: string): Promise<ApiUsageStats> {
    try {
      let query = this.supabase.client
        .from('api_usage_logs')
        .select('*');

      if (keyId) {
        query = query.eq('api_key_id', keyId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to get API usage stats', error);
        return {
          total_requests: 0,
          requests_today: 0,
          requests_this_month: 0,
          rate_limit_hits: 0,
          average_response_time: 0,
          error_rate: 0,
        };
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalRequests = data?.length || 0;
      const requestsToday = data?.filter(log => new Date(log.created_at) >= today).length || 0;
      const requestsThisMonth = data?.filter(log => new Date(log.created_at) >= thisMonth).length || 0;
      const rateLimitHits = data?.filter(log => log.status_code === 429).length || 0;
      const errors = data?.filter(log => log.status_code >= 400).length || 0;
      const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

      const responseTimes = data?.filter(log => log.response_time).map(log => log.response_time) || [];
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      return {
        total_requests: totalRequests,
        requests_today: requestsToday,
        requests_this_month: requestsThisMonth,
        rate_limit_hits: rateLimitHits,
        average_response_time: Math.round(averageResponseTime * 100) / 100,
        error_rate: Math.round(errorRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get API usage stats', error);
      return {
        total_requests: 0,
        requests_today: 0,
        requests_this_month: 0,
        rate_limit_hits: 0,
        average_response_time: 0,
        error_rate: 0,
      };
    }
  }

  async logApiUsage(keyId: string, endpoint: string, method: string, statusCode: number, responseTime: number, ipAddress: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('api_usage_logs')
        .insert({
          api_key_id: keyId,
          endpoint,
          method,
          status_code: statusCode,
          response_time: responseTime,
          ip_address: ipAddress,
          created_at: new Date().toISOString(),
        });

      if (error) {
        this.logger.error('Failed to log API usage', error);
      }
    } catch (error) {
      this.logger.error('Failed to log API usage', error);
    }
  }

  private generateSecureKey(): string {
    // Generate a 32-character secure random string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'cnc_';
    for (let i = 0; i < 28; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private hashApiKey(secretKey: string): string {
    return createHash('sha256').update(secretKey).digest('hex');
  }

  async validateEmbeddingAccess(configId: string, domain: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('embedding_configs')
        .select('allowed_domains')
        .eq('id', configId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.allowed_domains.includes(domain) || data.allowed_domains.includes('*');
    } catch (error) {
      this.logger.error('Failed to validate embedding access', error);
      return false;
    }
  }
}
