import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AdminOrgsService } from './admin-orgs.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReqUser } from '../auth/req-user.decorator';
import { Organization, QuotaSchema } from '../../../../../packages/shared/src/types/schema';
import { z } from 'zod';

type Quota = z.infer<typeof QuotaSchema>;

@Controller('admin/orgs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminOrgsController {
  constructor(private readonly adminOrgsService: AdminOrgsService) {}

  @Get()
  async getOrganizations(
    @Query('query') query?: string,
    @Query('plan') plan?: string,
    @Query('billing') billing?: string,
    @Query('compliance') compliance?: string,
  ) {
    return this.adminOrgsService.getOrganizations({
      query,
      plan,
      billing,
      compliance,
    });
  }

  @Get(':id')
  async getOrganization(@Param('id') id: string): Promise<Organization> {
    return this.adminOrgsService.getOrganization(id);
  }

  @Post()
  async createOrganization(
    @Body() body: { name: string; plan?: string; country: string },
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.createOrganization(
      body,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Put(':id')
  async updateOrganization(
    @Param('id') id: string,
    @Body() updates: Partial<Organization>,
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.updateOrganization(
      id,
      updates,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Put(':id/plan')
  async changePlan(
    @Param('id') id: string,
    @Body() body: { plan: string },
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.changePlan(
      id,
      body.plan,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Put(':id/itar')
  async toggleITARMode(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.toggleITARMode(
      id,
      body.enabled,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Get(':id/quota')
  async getQuota(@Param('id') id: string): Promise<Quota> {
    return this.adminOrgsService.getQuota(id);
  }

  @Put(':id/quota')
  async updateQuota(
    @Param('id') id: string,
    @Body() quota: Partial<Quota['limit']>,
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.updateQuota(
      id,
      quota,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.adminOrgsService.getMembers(id);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.removeMember(
      id,
      userId,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Get(':id/widget-origins')
  async getWidgetOrigins(@Param('id') id: string) {
    return this.adminOrgsService.getWidgetOrigins(id);
  }

  @Post(':id/widget-origins')
  async addWidgetOrigin(
    @Param('id') id: string,
    @Body() body: { origin: string },
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.addWidgetOrigin(
      id,
      body.origin,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Delete(':id/widget-origins')
  async removeWidgetOrigin(
    @Param('id') id: string,
    @Body() body: { origin: string },
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.removeWidgetOrigin(
      id,
      body.origin,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Get(':id/api-tokens')
  async getAPITokens(@Param('id') id: string) {
    return this.adminOrgsService.getAPITokens(id);
  }

  @Post(':id/api-tokens')
  async createAPIToken(
    @Param('id') id: string,
    @Body() body: { name: string; scope: string[] },
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.createAPIToken(
      id,
      body,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Delete(':id/api-tokens/:tokenId')
  async revokeAPIToken(
    @Param('id') id: string,
    @Param('tokenId') tokenId: string,
    @ReqUser() user: any,
  ) {
    return this.adminOrgsService.revokeAPIToken(
      id,
      tokenId,
      user.id,
      user.ip || 'unknown',
    );
  }

  @Get('audit')
  async getAuditEvents(
    @Query('org_id') orgId?: string,
  ) {
    return this.adminOrgsService.getAuditEvents({
      org_id: orgId,
    });
  }
}
