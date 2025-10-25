/**
 * @module marketplace/supplier-profile.controller
 * @ownership supplier-portal
 * @description Serves supplier portal profile requests with shared contract compliance and traceable metadata.
 */
import { Controller, ForbiddenException, Get, Req } from '@nestjs/common';
import { SUPPLIER_PORTAL_VERSION, SupplierProfileRespV1 } from '@cnc-quote/shared';

import { SuppliersService } from './suppliers.service';

@Controller('supplier/profile')
export class SupplierProfileController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async getProfile(@Req() req: any): Promise<SupplierProfileRespV1> {
    const orgId = req.user?.org_id ?? req.user?.orgId;
    const supplierId = req.user?.supplier_id ?? req.user?.supplierId;

    if (!orgId) {
      throw new ForbiddenException('Organization context required for supplier portal access');
    }

    if (!supplierId) {
      throw new ForbiddenException('Supplier membership required for portal profile access');
    }

    const supplier = await this.suppliersService.findOne(orgId, supplierId);

    return {
      portalVersion: SUPPLIER_PORTAL_VERSION,
      hydratedAt: new Date().toISOString(),
      supplier,
    };
  }
}
