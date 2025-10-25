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
  AdminFeatureFlagsService,
  FeatureFlag,
  FeatureFlagEvaluation,
} from './admin-feature-flags.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'org_admin')
export class AdminFeatureFlagsController {
  private readonly logger = new Logger(AdminFeatureFlagsController.name);

  constructor(private readonly featureFlagsService: AdminFeatureFlagsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    this.logger.log('Getting feature flags');
    return this.featureFlagsService.getFeatureFlags();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFeatureFlag(
    @Body() body: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<FeatureFlag> {
    this.logger.log('Creating feature flag');
    return this.featureFlagsService.createFeatureFlag(body);
  }

  @Put(':flagId')
  @HttpCode(HttpStatus.OK)
  async updateFeatureFlag(
    @Param('flagId') flagId: string,
    @Body() body: Partial<FeatureFlag>,
  ): Promise<FeatureFlag> {
    this.logger.log(`Updating feature flag ${flagId}`);
    return this.featureFlagsService.updateFeatureFlag(flagId, body);
  }

  @Delete(':flagId')
  @HttpCode(HttpStatus.OK)
  async deleteFeatureFlag(@Param('flagId') flagId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deleting feature flag ${flagId}`);
    await this.featureFlagsService.deleteFeatureFlag(flagId);
    return { success: true, message: 'Feature flag deleted successfully' };
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateFeatureFlag(
    @Body() body: {
      flag_key: string;
      context: {
        user_id?: string;
        user_role?: string;
        organization_id?: string;
        environment?: string;
      };
    },
  ): Promise<FeatureFlagEvaluation> {
    this.logger.log(`Evaluating feature flag ${body.flag_key}`);
    return this.featureFlagsService.evaluateFeatureFlag(body.flag_key, body.context);
  }

  @Post('user-flags')
  @HttpCode(HttpStatus.OK)
  async getFeatureFlagsForUser(
    @Body() body: {
      context: {
        user_id?: string;
        user_role?: string;
        organization_id?: string;
        environment?: string;
      };
    },
  ): Promise<Record<string, boolean>> {
    this.logger.log('Getting feature flags for user');
    return this.featureFlagsService.getFeatureFlagsForUser(body.context);
  }

  @Put(':flagId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleFeatureFlag(
    @Param('flagId') flagId: string,
    @Body() body: { enabled: boolean; updatedBy: string },
  ): Promise<FeatureFlag> {
    this.logger.log(`Toggling feature flag ${flagId}`);
    return this.featureFlagsService.toggleFeatureFlag(flagId, body.enabled, body.updatedBy);
  }

  @Put(':flagId/rollout')
  @HttpCode(HttpStatus.OK)
  async updateRolloutPercentage(
    @Param('flagId') flagId: string,
    @Body() body: { percentage: number; updatedBy: string },
  ): Promise<FeatureFlag> {
    this.logger.log(`Updating rollout percentage for flag ${flagId}`);
    return this.featureFlagsService.updateRolloutPercentage(flagId, body.percentage, body.updatedBy);
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  async getFeatureFlagAnalytics(): Promise<{
    total_flags: number;
    enabled_flags: number;
    disabled_flags: number;
    average_rollout: number;
  }> {
    this.logger.log('Getting feature flag analytics');
    const flags = await this.featureFlagsService.getFeatureFlags();

    const totalFlags = flags.length;
    const enabledFlags = flags.filter(f => f.enabled).length;
    const disabledFlags = totalFlags - enabledFlags;
    const averageRollout = totalFlags > 0
      ? flags.reduce((sum, f) => sum + f.rollout_percentage, 0) / totalFlags
      : 0;

    return {
      total_flags: totalFlags,
      enabled_flags: enabledFlags,
      disabled_flags: disabledFlags,
      average_rollout: Math.round(averageRollout * 100) / 100,
    };
  }
}
