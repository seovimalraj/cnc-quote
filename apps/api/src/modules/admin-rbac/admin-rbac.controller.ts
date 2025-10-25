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
import { AdminRbacService, RolePermission, UserRole, PolicySimulation } from './admin-rbac.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'org_admin')
export class AdminRbacController {
  private readonly logger = new Logger(AdminRbacController.name);

  constructor(private readonly rbacService: AdminRbacService) {}

  @Get('roles-matrix')
  @HttpCode(HttpStatus.OK)
  async getRolesMatrix(): Promise<RolePermission[]> {
    this.logger.log('Getting roles matrix');
    return this.rbacService.getRolesMatrix();
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getUsersList(): Promise<Array<{ id: string; name: string; email: string; role: string; last_active_at: string }>> {
    this.logger.log('Getting users list');
    return this.rbacService.getUsersList();
  }

  @Get('user-roles')
  @HttpCode(HttpStatus.OK)
  async getUserRoles(): Promise<UserRole[]> {
    this.logger.log('Getting user roles');
    return this.rbacService.getUserRoles();
  }

  @Post('assign-role')
  @HttpCode(HttpStatus.OK)
  async assignUserRole(
    @Body() body: { userId: string; role: string; assignedBy: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Assigning role ${body.role} to user ${body.userId}`);
    await this.rbacService.assignUserRole(body.userId, body.role, body.assignedBy);
    return { success: true, message: 'Role assigned successfully' };
  }

  @Post('disable-user')
  @HttpCode(HttpStatus.OK)
  async disableUser(
    @Body() body: { userId: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Disabling user ${body.userId}`);
    await this.rbacService.disableUser(body.userId);
    return { success: true, message: 'User disabled successfully' };
  }

  @Post('simulate-policy')
  @HttpCode(HttpStatus.OK)
  async simulatePolicy(
    @Body() body: { userId: string; resource: string; operation: string },
  ): Promise<PolicySimulation> {
    this.logger.log(`Simulating policy for user ${body.userId}, resource ${body.resource}, operation ${body.operation}`);
    return this.rbacService.simulatePolicy(body.userId, body.resource, body.operation);
  }

  @Get('available-roles')
  @HttpCode(HttpStatus.OK)
  async getAvailableRoles(): Promise<string[]> {
    this.logger.log('Getting available roles');
    return Object.keys(this.rbacService['builtInPermissions']);
  }

  @Get('role-permissions/:role')
  @HttpCode(HttpStatus.OK)
  async getRolePermissions(@Param('role') role: string): Promise<Record<string, string[]>> {
    this.logger.log(`Getting permissions for role ${role}`);
    const permissions = this.rbacService['builtInPermissions'][role];
    if (!permissions) {
      return {};
    }
    return permissions;
  }

  @Post('validate-role-change')
  @HttpCode(HttpStatus.OK)
  async validateRoleChange(
    @Body() body: { currentUserRole: string; targetRole: string; targetUserId: string },
  ): Promise<{ valid: boolean; message?: string }> {
    this.logger.log(`Validating role change from ${body.currentUserRole} to ${body.targetRole}`);
    const valid = this.rbacService.validateRoleChange(
      body.currentUserRole,
      body.targetRole,
      body.targetUserId,
    );
    return {
      valid,
      message: valid ? undefined : 'Role change not allowed',
    };
  }
}
