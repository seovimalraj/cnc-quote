/**
 * Step 17: Suppliers Controller
 * REST API for supplier CRUD and capability management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import type {
  CreateSupplierDto,
  UpdateSupplierDto,
  Capability,
  AttachFileDto,
} from '@cnc-quote/shared/marketplace';

// TODO: Import actual guards
// import { RbacGuard } from '../core/auth/auth/rbac.guard';
// import { RequirePermissions } from '../core/auth/auth/permissions.decorator';

@Controller('suppliers')
// @UseGuards(RbacGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * POST /suppliers
   * Create a new supplier
   */
  @Post()
  // @RequirePermissions('suppliers:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSupplierDto, @Req() req: any) {
    const orgId = req.user?.org_id || req.user?.orgId;
    const userId = req.user?.id;

    return this.suppliersService.create(orgId, userId, dto);
  }

  /**
   * GET /suppliers
   * List suppliers with optional filters
   */
  @Get()
  // @RequirePermissions('suppliers:read')
  async list(
    @Query('active') active?: string,
    @Query('region') region?: string,
    @Query('process') process?: string,
    @Req() req?: any,
  ) {
    const orgId = req.user?.org_id || req.user?.orgId;

    return this.suppliersService.list(orgId, {
      active: active ? active === 'true' : undefined,
      region,
      process,
    });
  }

  /**
   * GET /suppliers/:id
   * Get single supplier
   */
  @Get(':id')
  // @RequirePermissions('suppliers:read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.org_id || req.user?.orgId;
    return this.suppliersService.findOne(orgId, id);
  }

  /**
   * PUT /suppliers/:id
   * Update supplier
   */
  @Put(':id')
  // @RequirePermissions('suppliers:write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Req() req: any,
  ) {
    const orgId = req.user?.org_id || req.user?.orgId;
    const userId = req.user?.id;

    return this.suppliersService.update(orgId, userId, id, dto);
  }

  /**
   * DELETE /suppliers/:id
   * Delete supplier
   */
  @Delete(':id')
  // @RequirePermissions('suppliers:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.org_id || req.user?.orgId;
    const userId = req.user?.id;

    await this.suppliersService.delete(orgId, userId, id);
  }

  /**
   * POST /suppliers/:id/capabilities
   * Add capability to supplier
   */
  @Post(':id/capabilities')
  // @RequirePermissions('procCaps:write')
  @HttpCode(HttpStatus.CREATED)
  async addCapability(
    @Param('id') id: string,
    @Body() capability: Omit<Capability, 'id'>,
    @Req() req: any,
  ) {
    const orgId = req.user?.org_id || req.user?.orgId;
    return this.suppliersService.addCapability(orgId, id, capability);
  }

  /**
   * POST /suppliers/:id/files
   * Attach file to supplier
   */
  @Post(':id/files')
  // @RequirePermissions('suppliers:attach_files')
  @HttpCode(HttpStatus.CREATED)
  async attachFile(
    @Param('id') id: string,
    @Body() dto: AttachFileDto,
    @Req() req: any,
  ) {
    const orgId = req.user?.org_id || req.user?.orgId;
    const userId = req.user?.id;

    return this.suppliersService.attachFile(orgId, userId, id, dto);
  }
}
