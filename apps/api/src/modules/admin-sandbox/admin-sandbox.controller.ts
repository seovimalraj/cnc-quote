import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  AdminSandboxService,
  SandboxSettings,
  TestData,
  SandboxStats,
} from './admin-sandbox.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/sandbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'org_admin')
export class AdminSandboxController {
  private readonly logger = new Logger(AdminSandboxController.name);

  constructor(private readonly sandboxService: AdminSandboxService) {}

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  async getSandboxSettings(): Promise<SandboxSettings> {
    this.logger.log('Getting sandbox settings');
    return this.sandboxService.getSandboxSettings();
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  async updateSandboxSettings(
    @Body() body: { settings: Partial<SandboxSettings>; updatedBy: string },
  ): Promise<SandboxSettings> {
    this.logger.log('Updating sandbox settings');
    return this.sandboxService.updateSandboxSettings(body.settings, body.updatedBy);
  }

  @Put('enable')
  @HttpCode(HttpStatus.OK)
  async enableSandbox(
    @Body() body: { enabled: boolean; updatedBy: string },
  ): Promise<SandboxSettings> {
    this.logger.log(`Enabling sandbox: ${body.enabled}`);
    return this.sandboxService.enableSandbox(body.enabled, body.updatedBy);
  }

  @Get('test-data')
  @HttpCode(HttpStatus.OK)
  async getTestData(
    @Query() query: { type?: string; created_by?: string; expired?: boolean },
  ): Promise<TestData[]> {
    this.logger.log('Getting test data');
    return this.sandboxService.getTestData(query);
  }

  @Post('test-data')
  @HttpCode(HttpStatus.CREATED)
  async createTestData(
    @Body() body: {
      type: TestData['type'];
      name: string;
      metadata: Record<string, any>;
      createdBy: string;
      retentionDays?: number;
    },
  ): Promise<TestData> {
    this.logger.log('Creating test data');
    return this.sandboxService.createTestData(
      body.type,
      body.name,
      body.metadata,
      body.createdBy,
      body.retentionDays,
    );
  }

  @Delete('test-data/:dataId')
  @HttpCode(HttpStatus.OK)
  async deleteTestData(@Param('dataId') dataId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deleting test data ${dataId}`);
    await this.sandboxService.deleteTestData(dataId);
    return { success: true, message: 'Test data deleted successfully' };
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredTestData(): Promise<{ deleted_count: number }> {
    this.logger.log('Cleaning up expired test data');
    return this.sandboxService.cleanupExpiredTestData();
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getSandboxStats(): Promise<SandboxStats> {
    this.logger.log('Getting sandbox stats');
    return this.sandboxService.getSandboxStats();
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetSandbox(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Resetting sandbox');
    return this.sandboxService.resetSandbox();
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  async exportTestData(): Promise<{ data: TestData[]; export_timestamp: string }> {
    this.logger.log('Exporting test data');
    return this.sandboxService.exportTestData();
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importTestData(
    @Body() body: { data: TestData[]; importedBy: string },
  ): Promise<{ imported_count: number }> {
    this.logger.log('Importing test data');
    return this.sandboxService.importTestData(body.data, body.importedBy);
  }

  @Post('validate-access')
  @HttpCode(HttpStatus.OK)
  async validateSandboxAccess(
    @Body() body: { userId: string },
  ): Promise<{ allowed: boolean; message: string }> {
    this.logger.log(`Validating sandbox access for ${body.userId}`);
    const allowed = await this.sandboxService.validateSandboxAccess(body.userId);
    return {
      allowed,
      message: allowed ? 'Access allowed' : 'Access denied - limits exceeded',
    };
  }

  @Post('schedule-cleanup')
  @HttpCode(HttpStatus.OK)
  async scheduleCleanup(
    @Body() body: { cronExpression: string; updatedBy: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Scheduling cleanup');
    return this.sandboxService.scheduleCleanup(body.cronExpression, body.updatedBy);
  }

  @Get('available-features')
  @HttpCode(HttpStatus.OK)
  async getAvailableFeatures(): Promise<string[]> {
    this.logger.log('Getting available features');
    return [
      'production_data_access',
      'external_emails',
      'payment_processing',
      'file_uploads',
      'api_access',
      'user_management',
      'organization_management',
      'analytics_access',
    ];
  }

  @Get('retention-options')
  @HttpCode(HttpStatus.OK)
  async getRetentionOptions(): Promise<{ days: number; label: string }[]> {
    this.logger.log('Getting retention options');
    return [
      { days: 7, label: '1 week' },
      { days: 30, label: '1 month' },
      { days: 90, label: '3 months' },
      { days: 180, label: '6 months' },
      { days: 365, label: '1 year' },
    ];
  }
}
