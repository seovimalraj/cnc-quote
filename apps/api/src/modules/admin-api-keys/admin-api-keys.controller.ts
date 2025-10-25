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
  AdminApiKeysService,
  ApiKey,
  ApiKeyWithSecret,
  EmbeddingConfig,
  ApiUsageStats,
} from './admin-api-keys.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'org_admin')
export class AdminApiKeysController {
  private readonly logger = new Logger(AdminApiKeysController.name);

  constructor(private readonly apiKeysService: AdminApiKeysService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateApiKey(
    @Body() body: {
      name: string;
      permissions: string[];
      rateLimit: number;
      expiresAt?: string;
      createdBy: string;
    },
  ): Promise<ApiKeyWithSecret> {
    this.logger.log('Generating API key');
    return this.apiKeysService.generateApiKey(
      body.name,
      body.permissions,
      body.rateLimit,
      body.expiresAt || null,
      body.createdBy,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getApiKeys(): Promise<ApiKey[]> {
    this.logger.log('Getting API keys');
    return this.apiKeysService.getApiKeys();
  }

  @Put(':keyId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(
    @Param('keyId') keyId: string,
    @Body() body: { revokedBy: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Revoking API key ${keyId}`);
    await this.apiKeysService.revokeApiKey(keyId, body.revokedBy);
    return { success: true, message: 'API key revoked successfully' };
  }

  @Put(':keyId/permissions')
  @HttpCode(HttpStatus.OK)
  async updateApiKeyPermissions(
    @Param('keyId') keyId: string,
    @Body() body: { permissions: string[]; updatedBy: string },
  ): Promise<ApiKey> {
    this.logger.log(`Updating API key permissions ${keyId}`);
    return this.apiKeysService.updateApiKeyPermissions(keyId, body.permissions, body.updatedBy);
  }

  @Get('embedding-configs')
  @HttpCode(HttpStatus.OK)
  async getEmbeddingConfigs(): Promise<EmbeddingConfig[]> {
    this.logger.log('Getting embedding configs');
    return this.apiKeysService.getEmbeddingConfigs();
  }

  @Post('embedding-configs')
  @HttpCode(HttpStatus.CREATED)
  async createEmbeddingConfig(
    @Body() body: {
      name: string;
      allowedDomains: string[];
      rateLimit: number;
      features: string[];
      cssCustomization: string;
      jsCustomization: string;
      createdBy: string;
    },
  ): Promise<EmbeddingConfig> {
    this.logger.log('Creating embedding config');
    return this.apiKeysService.createEmbeddingConfig(
      body.name,
      body.allowedDomains,
      body.rateLimit,
      body.features,
      body.cssCustomization,
      body.jsCustomization,
      body.createdBy,
    );
  }

  @Put('embedding-configs/:configId')
  @HttpCode(HttpStatus.OK)
  async updateEmbeddingConfig(
    @Param('configId') configId: string,
    @Body() body: { updates: Partial<EmbeddingConfig>; updatedBy: string },
  ): Promise<EmbeddingConfig> {
    this.logger.log(`Updating embedding config ${configId}`);
    return this.apiKeysService.updateEmbeddingConfig(configId, body.updates, body.updatedBy);
  }

  @Delete('embedding-configs/:configId')
  @HttpCode(HttpStatus.OK)
  async deleteEmbeddingConfig(@Param('configId') configId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deleting embedding config ${configId}`);
    await this.apiKeysService.deleteEmbeddingConfig(configId);
    return { success: true, message: 'Embedding config deleted successfully' };
  }

  @Get('usage-stats')
  @HttpCode(HttpStatus.OK)
  async getApiUsageStats(@Query('keyId') keyId?: string): Promise<ApiUsageStats> {
    this.logger.log('Getting API usage stats');
    return this.apiKeysService.getApiUsageStats(keyId);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateApiKey(@Body() body: { secretKey: string }): Promise<{
    valid: boolean;
    key?: ApiKey;
    permissions?: string[];
  }> {
    this.logger.log('Validating API key');
    return this.apiKeysService.validateApiKey(body.secretKey);
  }

  @Post('embedding-access')
  @HttpCode(HttpStatus.OK)
  async validateEmbeddingAccess(
    @Body() body: { configId: string; domain: string },
  ): Promise<{ allowed: boolean; message: string }> {
    this.logger.log(`Validating embedding access for ${body.domain}`);
    const allowed = await this.apiKeysService.validateEmbeddingAccess(body.configId, body.domain);
    return {
      allowed,
      message: allowed ? 'Access allowed' : 'Access denied',
    };
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  async getAvailablePermissions(): Promise<string[]> {
    this.logger.log('Getting available permissions');
    return [
      'quotes:read',
      'quotes:write',
      'quotes:delete',
      'files:read',
      'files:write',
      'files:delete',
      'users:read',
      'users:write',
      'organizations:read',
      'organizations:write',
      'analytics:read',
      'webhooks:read',
      'webhooks:write',
      'embeddings:read',
      'embeddings:write',
    ];
  }

  @Get('features')
  @HttpCode(HttpStatus.OK)
  async getAvailableFeatures(): Promise<string[]> {
    this.logger.log('Getting available features');
    return [
      'quote_widget',
      'price_calculator',
      'file_upload',
      'real_time_updates',
      'custom_styling',
      'analytics_tracking',
      'error_handling',
      'rate_limiting',
    ];
  }
}
