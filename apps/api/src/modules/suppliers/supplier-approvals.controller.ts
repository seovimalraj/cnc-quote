import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrgGuard } from '../auth/org.guard';
import { RbacGuard } from '../auth/rbac.middleware';
import { ReqUser } from '../auth/req-user.decorator';
import { SupplierApprovalsService } from './supplier-approvals.service';

@Controller('admin/suppliers/:supplierId')
@UseGuards(JwtAuthGuard, OrgGuard)
export class SupplierApprovalsController {
  constructor(private readonly svc: SupplierApprovalsService) {}

  @Post('approvals')
  @UseGuards(RbacGuard('admin:update', 'org'))
  async approve(
    @Param('supplierId') supplierId: string,
    @Body()
    body: {
      quoteId: string;
      approved: boolean;
      capacityCommitment?: number | null;
      expiresAt?: string | null;
      notes?: string | null;
    },
    @ReqUser() user: any,
  ) {
    return this.svc.recordApproval(supplierId, body as any, user);
  }

  @Get('approvals')
  @UseGuards(RbacGuard('admin:read', 'org'))
  async list(@Param('supplierId') supplierId: string, @Query('quoteId') quoteId: string | undefined, @ReqUser() user: any) {
    return this.svc.listApprovals(supplierId, user, quoteId);
  }
}
