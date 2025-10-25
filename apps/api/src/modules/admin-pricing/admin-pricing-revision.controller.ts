import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ReqUser } from "../auth/req-user.decorator";
import { ContractsV1 } from '@cnc-quote/shared';
import { AdminPricingRevisionAssistantService } from './admin-pricing-revision-assistant.service';
import { AdminPricingRevisionThrottleGuard } from './admin-pricing-revision.throttle.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('admin/pricing/revision-assistant')
@UseGuards(AuthGuard, RolesGuard)
export class AdminPricingRevisionController {
  constructor(private readonly assistant: AdminPricingRevisionAssistantService) {}

  @Post()
  @Roles('admin', 'org_admin', 'finance')
  @UseGuards(AdminPricingRevisionThrottleGuard)
  async requestAssistant(@Body() body: unknown, @Req() req: any, @ReqUser() user: any) {
    const parsed = ContractsV1.AdminPricingRevisionAssistantRequestSchemaV1.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { error: 'Invalid assistant request payload', details: parsed.error.flatten() },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.assistant.requestProposal(parsed.data, user, this.extractTraceId(req));
    } catch (error) {
      throw this.wrapError(error, 'Failed to schedule pricing revision assistant run');
    }
  }

  @Get()
  @Roles('admin', 'org_admin', 'finance')
  async listRuns(@ReqUser() user: any) {
    try {
      return await this.assistant.listRuns(user);
    } catch (error) {
      throw this.wrapError(error, 'Failed to list pricing revision assistant runs');
    }
  }

  @Get(':runId')
  @Roles('admin', 'org_admin', 'finance')
  async getRun(@Param('runId') runId: string, @ReqUser() user: any) {
    try {
      return await this.assistant.getRun(runId, user);
    } catch (error) {
      throw this.wrapError(error, 'Failed to load pricing revision assistant run');
    }
  }

  @Post(':runId/approvals')
  @Roles('admin', 'org_admin', 'finance')
  async recordApproval(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Req() req: any,
    @ReqUser() user: any,
  ) {
    const parsed = ContractsV1.AdminPricingRevisionAssistantApprovalRequestSchemaV1.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { error: 'Invalid approval payload', details: parsed.error.flatten() },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.assistant.recordApproval(runId, parsed.data, user, this.extractTraceId(req));
    } catch (error) {
      throw this.wrapError(error, 'Failed to record pricing revision assistant approval');
    }
  }

  private extractTraceId(req: any): string | undefined {
    if (!req) {
      return undefined;
    }
    if (typeof req.traceId === 'string' && req.traceId.length > 0) {
      return req.traceId;
    }
    if (typeof req.requestId === 'string' && req.requestId.length > 0) {
      return req.requestId;
    }

    const headerKeys = ['x-trace-id', 'x-request-id', 'traceparent'];
    for (const key of headerKeys) {
      const value = req.headers?.[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
      if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
        return value[0];
      }
    }
    return undefined;
  }

  private wrapError(error: unknown, message: string): HttpException {
    if (error instanceof HttpException) {
      return error;
    }
    const err = error as Error;
    return new HttpException({ error: message, details: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
