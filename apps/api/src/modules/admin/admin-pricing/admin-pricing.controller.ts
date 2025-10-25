import { Body, Controller, Get, HttpException, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminPricingService } from './admin-pricing.service';
import { Roles } from "../../core/auth/roles.decorator";
import { RolesGuard } from "../../core/auth/roles.guard";
import { ReqUser } from "../../core/auth/req-user.decorator";
import { AdminPricingConfigSchema } from '@cnc-quote/shared';

@Controller('admin/pricing')
@UseGuards(AuthGuard, RolesGuard)
export class AdminPricingController {
  constructor(private readonly adminPricingService: AdminPricingService) {}

  @Get('config')
  @Roles('admin', 'org_admin', 'finance')
  async getConfig() {
    try {
      return await this.adminPricingService.getConfig();
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to load pricing config', details: (error as Error).message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('config')
  @Roles('admin', 'org_admin', 'finance')
  async saveDraft(@Body() body: unknown, @ReqUser() user: any) {
    const parsed = AdminPricingConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { error: 'Invalid pricing config payload', details: parsed.error.flatten() },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.adminPricingService.saveDraft(parsed.data, user?.userId ?? undefined);
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to save pricing config', details: (error as Error).message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('publish')
  @Roles('admin', 'org_admin', 'finance')
  async publish(@Body() body: any, @ReqUser() user: any) {
    const candidate = body?.config ?? body;
    const parsed = AdminPricingConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new HttpException(
        { error: 'Invalid pricing config payload', details: parsed.error.flatten() },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const assistantRunId = typeof body?.assistantRunId === 'string' ? body.assistantRunId : undefined;
      const orgId = user?.orgId ?? user?.organizationId ?? user?.organization_id ?? null;
      return await this.adminPricingService.publishConfig(parsed.data, user?.userId ?? undefined, {
        assistantRunId: assistantRunId ?? null,
        orgId,
      });
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to publish pricing config', details: (error as Error).message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
