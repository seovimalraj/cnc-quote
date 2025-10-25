import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrgGuard } from '../auth/org.guard';
import { RbacGuard } from '../auth/rbac.middleware';
import { ReqUser } from '../auth/req-user.decorator';
import { SupplierCapabilitiesService } from './supplier-capabilities.service';
import type { ContractsV1 } from '@cnc-quote/shared';

@Controller('admin/suppliers/:supplierId')
@UseGuards(JwtAuthGuard, OrgGuard)
export class SupplierCapabilitiesController {
  constructor(private readonly svc: SupplierCapabilitiesService) {}

  @Get('capabilities')
  @UseGuards(RbacGuard('admin:read', 'org'))
  async getCapability(@Param('supplierId') supplierId: string, @ReqUser() user: any) {
    return this.svc.getCapability(supplierId, user);
  }

  @Put('capabilities')
  @UseGuards(RbacGuard('admin:update', 'org'))
  async putCapability(
    @Param('supplierId') supplierId: string,
    @Body() body: Partial<ContractsV1.SupplierCapabilityV1>,
    @ReqUser() user: any,
  ) {
    return this.svc.upsertCapability(supplierId, body, user);
  }

  @Patch('capabilities')
  @UseGuards(RbacGuard('admin:update', 'org'))
  async patchCapability(
    @Param('supplierId') supplierId: string,
    @Body() body: Partial<ContractsV1.SupplierCapabilityV1>,
    @ReqUser() user: any,
  ) {
    return this.svc.upsertCapability(supplierId, body, user);
  }
}
