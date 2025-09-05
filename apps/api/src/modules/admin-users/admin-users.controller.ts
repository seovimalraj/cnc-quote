import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ReqUser } from '../../auth/req-user.decorator';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles('admin')
  async getUsers(
    @Query() filters: {
      query?: string;
      status?: string;
      role?: string;
      org_id?: string;
      sso?: string;
      page?: number;
      page_size?: number;
    },
  ) {
    try {
      const result = await this.adminUsersService.getUsers(filters);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch users', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Roles('admin')
  async getUser(
    @Param('id') userId: string,
  ) {
    try {
      const user = await this.adminUsersService.getUser(userId);
      return { data: user };
    } catch (error) {
      throw new HttpException(
        { error: 'User not found', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/memberships')
  @Roles('admin')
  async getUserMemberships(
    @Param('id') userId: string,
  ) {
    try {
      const memberships = await this.adminUsersService.getUserMemberships(userId);
      return { data: memberships };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch user memberships', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('invite')
  @Roles('admin')
  async createInvite(
    @Body() inviteData: {
      email: string;
      organization_id: string;
      role: string;
    },
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.createInvite(
        inviteData,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create invite', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('invites/:id/resend')
  @Roles('admin')
  async resendInvite(
    @Param('id') inviteId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.resendInvite(
        inviteId,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to resend invite', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('invites/:id/revoke')
  @Roles('admin')
  async revokeInvite(
    @Param('id') inviteId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.revokeInvite(
        inviteId,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to revoke invite', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('memberships/:id/role')
  @Roles('admin')
  async changeRole(
    @Param('id') membershipId: string,
    @Body() body: { role: string },
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.changeRole(
        membershipId,
        body.role,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to change role', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/disable')
  @Roles('admin')
  async disableUser(
    @Param('id') userId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.disableUser(
        userId,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to disable user', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/enable')
  @Roles('admin')
  async enableUser(
    @Param('id') userId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.enableUser(
        userId,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to enable user', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/reset-mfa')
  @Roles('admin')
  async resetMFA(
    @Param('id') userId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.resetMFA(
        userId,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to reset MFA', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/force-password-reset')
  @Roles('admin')
  async forcePasswordReset(
    @Param('id') userId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.forcePasswordReset(
        userId,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to force password reset', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/revoke-sessions')
  @Roles('admin')
  async revokeUserSessions(
    @Param('id') userId: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.revokeUserSessions(
        userId,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to revoke user sessions', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/impersonate')
  @Roles('admin')
  async startImpersonation(
    @Param('id') userId: string,
    @Body() body: { reason: string },
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.adminUsersService.startImpersonation(
        userId,
        body.reason,
        user.userId,
        '127.0.0.1', // TODO: Get real IP
      );
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to start impersonation', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/audit')
  @Roles('admin')
  async getUserAuditEvents(
    @Param('id') userId: string,
  ) {
    try {
      const events = await this.adminUsersService.getAuditEvents({
        target_type: 'user',
        target_id: userId,
      });
      return { data: events };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch audit events', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
