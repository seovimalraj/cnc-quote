/**
 * @module marketplace/supplier-quotes.controller
 * @ownership supplier-portal
 * @description Exposes supplier quote listings and refresh triggers using shared marketplace contracts.
 */
import { Controller, ForbiddenException, Get, Post, Req } from '@nestjs/common';
import { SUPPLIER_PORTAL_VERSION, SupplierQuotesRespV1 } from '@cnc-quote/shared/marketplace';

import { SupplierQuotesService } from './supplier-quotes.service';

@Controller('supplier/quotes')
export class SupplierQuotesController {
  constructor(private readonly supplierQuotes: SupplierQuotesService) {}

  @Get()
  async list(@Req() req: any): Promise<SupplierQuotesRespV1> {
    const { orgId, supplierId } = this.extractContext(req);
    const quotes = await this.supplierQuotes.listForSupplier(orgId, supplierId);

    return {
      portalVersion: SUPPLIER_PORTAL_VERSION,
      hydratedAt: new Date().toISOString(),
      quotes,
    };
  }

  @Post('refresh')
  async refresh(@Req() req: any): Promise<SupplierQuotesRespV1> {
    const { orgId, supplierId } = this.extractContext(req);
    const quotes = await this.supplierQuotes.listForSupplier(orgId, supplierId);

    return {
      portalVersion: SUPPLIER_PORTAL_VERSION,
      hydratedAt: new Date().toISOString(),
      quotes,
    };
  }

  private extractContext(req: any): { orgId: string; supplierId: string } {
    const orgId = req.user?.org_id ?? req.user?.orgId;
    const supplierId = req.user?.supplier_id ?? req.user?.supplierId;

    if (!orgId) {
      throw new ForbiddenException('Organization context required for supplier quote access');
    }

    if (!supplierId) {
      throw new ForbiddenException('Supplier membership required for supplier quote access');
    }

    return { orgId, supplierId };
  }
}
