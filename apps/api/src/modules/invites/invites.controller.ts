import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { InvitesService } from './invites.service';
import { InviteDtoSchema } from '../orgs/dto/invite.dto';
import { RbacGuard } from '../auth/rbac.middleware';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrgGuard } from '../auth/org.guard';

@Controller()
@UseGuards(JwtAuthGuard, OrgGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('orgs/:id/invite')
  @UseGuards(RbacGuard('org:invite', 'org'))
  async createInvite(
    @Req() req: Request,
    @Param('id') orgId: string,
    @Body() body: unknown,
  ) {
    const dto = InviteDtoSchema.parse(body);
    req.audit = {
      action: 'ORG_INVITE_SENT',
      resourceType: 'org',
      resourceId: orgId,
      before: null,
      after: { email: dto.email, role: dto.role },
    };
    return this.invitesService.createInvite(orgId, req.user?.sub, dto);
  }

  @Post('invites/:token/accept')
  async accept(@Req() req: Request, @Param('token') token: string) {
    const userId = req.user?.sub;
    const email = req.user?.email;
    if (!userId || !email) {
      throw new Error('Authentication required to accept invite');
    }
    req.audit = {
      action: 'ORG_INVITE_ACCEPTED',
      resourceType: 'org_member',
      resourceId: userId,
      before: null,
    };
    const result = await this.invitesService.acceptInvite(token, userId, email);
    req.org = { id: result.orgId };
    req.audit.after = { role: result.role, orgId: result.orgId };
    req.audit.resourceId = userId;
    return result;
  }
}
