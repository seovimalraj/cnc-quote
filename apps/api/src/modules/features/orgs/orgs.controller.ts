import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrgsService } from './orgs.service';
import { CreateOrgDtoSchema } from './dto/create-org.dto';
import { RbacGuard } from "../../core/auth/rbac.middleware";
import { UpdateMemberRoleDtoSchema } from './dto/update-member-role.dto';

@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Get()
  @UseGuards(RbacGuard('org:read', 'org'))
  async list(@Req() req: Request) {
    const userId = req.user?.sub;
    return this.orgsService.listUserOrgs(userId);
  }

  @Post()
  @UseGuards(RbacGuard('org:create', 'org'))
  async create(@Req() req: Request, @Body() body: unknown) {
    const userId = req.user?.sub;
    const dto = CreateOrgDtoSchema.parse(body);
    req.audit = {
      action: 'ORG_CREATED',
      resourceType: 'org',
      resourceId: null,
      before: null,
    };
    const org = await this.orgsService.createOrg(userId, dto);
    req.audit.resourceId = org.id;
    req.audit.after = org;
    return org;
  }

  @Post(':id/switch')
  @UseGuards(RbacGuard('org:switch', 'org'))
  async switch(@Req() req: Request, @Param('id') orgId: string) {
    const userId = req.user?.sub;
    req.audit = {
      action: 'ORG_SWITCH',
      resourceType: 'org',
      resourceId: orgId,
      before: null,
    };
    await this.orgsService.switchOrg(userId, orgId);
    return { switched: true };
  }

  @Get(':id/members')
  @UseGuards(RbacGuard('org:read', 'org'))
  async members(@Param('id') orgId: string) {
    return this.orgsService.listMembers(orgId);
  }

  @Post(':id/members/:userId/role')
  @UseGuards(RbacGuard('org:member:update', 'org'))
  async updateRole(
    @Req() req: Request,
    @Param('id') orgId: string,
    @Param('userId') targetUserId: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateMemberRoleDtoSchema.parse(body);
    const result = await this.orgsService.updateMemberRole(orgId, targetUserId, dto.role);
    req.audit = {
      action: 'ROLE_CHANGED',
      resourceType: 'org_member',
      resourceId: targetUserId,
      before: result.previousRole ? { role: result.previousRole } : null,
      after: { role: result.role },
    };
    return { updated: true };
  }
}
