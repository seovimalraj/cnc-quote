import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";

export interface SandboxSettings {
  id: string;
  enabled: boolean;
  test_data_retention_days: number;
  max_test_users: number;
  max_test_quotes: number;
  allow_external_access: boolean;
  notification_email: string;
  auto_cleanup: boolean;
  restricted_features: string[];
  last_updated: string;
  updated_by: string;
}

export interface TestData {
  id: string;
  type: 'user' | 'quote' | 'file' | 'organization';
  name: string;
  created_at: string;
  expires_at: string;
  created_by: string;
  metadata: Record<string, any>;
}

export interface SandboxStats {
  total_test_users: number;
  total_test_quotes: number;
  total_test_files: number;
  storage_used_mb: number;
  oldest_test_data: string;
  cleanup_scheduled: boolean;
}

@Injectable()
export class AdminSandboxService {
  private readonly logger = new Logger(AdminSandboxService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getSandboxSettings(): Promise<SandboxSettings> {
    try {
      const { data, error } = await this.supabase.client
        .from('sandbox_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        this.logger.error('Failed to get sandbox settings', error);
        throw new BadRequestException('Failed to get sandbox settings');
      }

      // Return defaults if no settings exist
      if (!data) {
        return {
          id: 'default',
          enabled: false,
          test_data_retention_days: 30,
          max_test_users: 100,
          max_test_quotes: 500,
          allow_external_access: false,
          notification_email: '',
          auto_cleanup: true,
          restricted_features: ['production_data_access', 'external_emails', 'payment_processing'],
          last_updated: new Date().toISOString(),
          updated_by: 'system',
        };
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get sandbox settings', error);
      throw error;
    }
  }

  async updateSandboxSettings(settings: Partial<SandboxSettings>, updatedBy: string): Promise<SandboxSettings> {
    try {
      const updatedSettings = {
        ...settings,
        last_updated: new Date().toISOString(),
        updated_by: updatedBy,
      };

      const { data, error } = await this.supabase.client
        .from('sandbox_settings')
        .upsert(updatedSettings)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update sandbox settings', error);
        throw new BadRequestException('Failed to update sandbox settings');
      }

      // Clear cache
      await this.cache.del('sandbox_settings');

      return data;
    } catch (error) {
      this.logger.error('Failed to update sandbox settings', error);
      throw error;
    }
  }

  async enableSandbox(enabled: boolean, updatedBy: string): Promise<SandboxSettings> {
    return this.updateSandboxSettings({ enabled }, updatedBy);
  }

  async getTestData(filters?: {
    type?: string;
    created_by?: string;
    expired?: boolean;
  }): Promise<TestData[]> {
    try {
      let query = this.supabase.client
        .from('test_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      if (filters?.expired !== undefined) {
        const now = new Date().toISOString();
        if (filters.expired) {
          query = query.lt('expires_at', now);
        } else {
          query = query.gte('expires_at', now);
        }
      }

      const { data, error } = await query.limit(100);

      if (error) {
        this.logger.error('Failed to get test data', error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get test data', error);
      return [];
    }
  }

  async createTestData(
    type: TestData['type'],
    name: string,
    metadata: Record<string, any>,
    createdBy: string,
    retentionDays: number = 30,
  ): Promise<TestData> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + retentionDays);

      const { data, error } = await this.supabase.client
        .from('test_data')
        .insert({
          type,
          name,
          metadata,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create test data', error);
        throw new BadRequestException('Failed to create test data');
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to create test data', error);
      throw error;
    }
  }

  async deleteTestData(dataId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('test_data')
        .delete()
        .eq('id', dataId);

      if (error) {
        this.logger.error('Failed to delete test data', error);
        throw new BadRequestException('Failed to delete test data');
      }
    } catch (error) {
      this.logger.error('Failed to delete test data', error);
      throw error;
    }
  }

  async cleanupExpiredTestData(): Promise<{ deleted_count: number }> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase.client
        .from('test_data')
        .delete()
        .lt('expires_at', now)
        .select('id');

      if (error) {
        this.logger.error('Failed to cleanup expired test data', error);
        throw new BadRequestException('Failed to cleanup expired test data');
      }

      return { deleted_count: data?.length || 0 };
    } catch (error) {
      this.logger.error('Failed to cleanup expired test data', error);
      throw error;
    }
  }

  async getSandboxStats(): Promise<SandboxStats> {
    try {
      const settings = await this.getSandboxSettings();

      // Get test data counts
      const { data: testData, error: testDataError } = await this.supabase.client
        .from('test_data')
        .select('type, created_at');

      if (testDataError) {
        this.logger.error('Failed to get test data for stats', testDataError);
      }

      const totalTestUsers = testData?.filter(d => d.type === 'user').length || 0;
      const totalTestQuotes = testData?.filter(d => d.type === 'quote').length || 0;
      const totalTestFiles = testData?.filter(d => d.type === 'file').length || 0;

      // Calculate oldest test data
      const oldestTestData = testData && testData.length > 0
        ? testData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at
        : new Date().toISOString();

      return {
        total_test_users: totalTestUsers,
        total_test_quotes: totalTestQuotes,
        total_test_files: totalTestFiles,
        storage_used_mb: Math.round((totalTestFiles * 5.2) * 100) / 100, // Rough estimate: 5.2MB per file
        oldest_test_data: oldestTestData,
        cleanup_scheduled: settings.auto_cleanup,
      };
    } catch (error) {
      this.logger.error('Failed to get sandbox stats', error);
      throw error;
    }
  }

  async resetSandbox(): Promise<{ success: boolean; message: string }> {
    try {
      // Delete all test data
      const { error: deleteError } = await this.supabase.client
        .from('test_data')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        this.logger.error('Failed to reset sandbox', deleteError);
        throw new BadRequestException('Failed to reset sandbox');
      }

      return {
        success: true,
        message: 'Sandbox reset successfully. All test data has been removed.',
      };
    } catch (error) {
      this.logger.error('Failed to reset sandbox', error);
      throw error;
    }
  }

  async exportTestData(): Promise<{ data: TestData[]; export_timestamp: string }> {
    try {
      const testData = await this.getTestData();

      return {
        data: testData,
        export_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to export test data', error);
      throw error;
    }
  }

  async importTestData(data: TestData[], importedBy: string): Promise<{ imported_count: number }> {
    try {
      const importData = data.map(item => ({
        ...item,
        created_by: importedBy,
        created_at: new Date().toISOString(),
      }));

      const { data: inserted, error } = await this.supabase.client
        .from('test_data')
        .insert(importData)
        .select('id');

      if (error) {
        this.logger.error('Failed to import test data', error);
        throw new BadRequestException('Failed to import test data');
      }

      return { imported_count: inserted?.length || 0 };
    } catch (error) {
      this.logger.error('Failed to import test data', error);
      throw error;
    }
  }

  async validateSandboxAccess(userId: string): Promise<boolean> {
    try {
      const settings = await this.getSandboxSettings();

      if (!settings.enabled) {
        return false;
      }

      // Check if user has exceeded limits
      const userTestData = await this.getTestData({ created_by: userId });
      const userTestQuotes = userTestData.filter(d => d.type === 'quote').length;

      return userTestQuotes < settings.max_test_quotes;
    } catch (error) {
      this.logger.error('Failed to validate sandbox access', error);
      return false;
    }
  }

  async scheduleCleanup(cronExpression: string, updatedBy: string): Promise<{ success: boolean; message: string }> {
    try {
      // This would integrate with a job scheduler in a real implementation
      const settings = await this.getSandboxSettings();
      await this.updateSandboxSettings({
        ...settings,
        auto_cleanup: true,
      }, updatedBy);

      return {
        success: true,
        message: `Cleanup scheduled with cron expression: ${cronExpression}`,
      };
    } catch (error) {
      this.logger.error('Failed to schedule cleanup', error);
      throw error;
    }
  }
}
