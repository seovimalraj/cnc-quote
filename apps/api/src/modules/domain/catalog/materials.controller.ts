import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from "../../core/auth/org.guard";
import { RbacGuard } from "../../core/auth/rbac.middleware";
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, REGION_WHITELIST } from "../../../lib/materials/dto/create-material.dto";
import { UpdateMaterialDto } from "../../../lib/materials/dto/update-material.dto";
import { MaterialRegion } from "../../../../../packages/shared/src/types/schema";

type MaterialRequest = Request & {
  rbac?: {
    orgId: string;
  };
  setAudit?: (preset: {
    action: string;
    resourceType: string;
    resourceId?: string | null;
    before?: unknown;
    after?: unknown;
  }) => void;
};

@Controller('admin/materials')
@UseGuards(AuthGuard, OrgGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @UseGuards(RbacGuard('material_properties:read', 'material_properties'))
  async getMaterials(@Req() req: MaterialRequest, @Query() query: Record<string, string | string[]>) {
    const search = typeof query.search === 'string' ? query.search.trim() || undefined : undefined;
    const process = typeof query.process === 'string' ? query.process : undefined;

    const regionCandidate = typeof query.region === 'string' ? query.region.toUpperCase() : undefined;
    const region = regionCandidate && REGION_WHITELIST.has(regionCandidate)
      ? (regionCandidate as MaterialRegion)
      : undefined;

    const categoryCode = typeof query.category_code === 'string' ? query.category_code.toUpperCase() : undefined;
    const includeInactive = query.include_inactive === 'true' || query.includeInactive === 'true';

    const filters = {
      search,
      process,
      region,
      categoryCode,
      includeInactive,
    };

    const materials = await this.materialsService.getMaterials(req.rbac?.orgId ?? '', filters);
    return { data: materials };
  }

  @Get('categories')
  @UseGuards(RbacGuard('material_properties:read', 'material_properties'))
  async listCategories() {
    const categories = await this.materialsService.listCategories();
    return { data: categories };
  }

  @Get(':id')
  @UseGuards(RbacGuard('material_properties:read', 'material_properties'))
  async getMaterial(@Param('id') id: string) {
    const material = await this.materialsService.getMaterial(id);
    return { data: material };
  }

  @Post()
  @UseGuards(RbacGuard('material_properties:create', 'material_properties'))
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createMaterial(@Req() req: MaterialRequest, @Body() body: CreateMaterialDto) {
    const material = await this.materialsService.createMaterial(body, {
      orgId: req.rbac?.orgId,
      actorId: req.user?.sub,
    });

    req.setAudit?.({
      action: 'MATERIAL_CREATED',
      resourceType: 'material',
      resourceId: material.id,
      before: null,
      after: material,
    });

    return { data: material };
  }

  @Put(':id')
  @UseGuards(RbacGuard('material_properties:update', 'material_properties'))
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateMaterial(@Req() req: MaterialRequest, @Param('id') id: string, @Body() body: UpdateMaterialDto) {
    const before = await this.materialsService.getMaterial(id);
    const material = await this.materialsService.updateMaterial(id, body, {
      orgId: req.rbac?.orgId,
      actorId: req.user?.sub,
    });

    req.setAudit?.({
      action: 'MATERIAL_UPDATED',
      resourceType: 'material',
      resourceId: material.id,
      before,
      after: material,
    });

    return { data: material };
  }

  @Put(':id/retire')
  @UseGuards(RbacGuard('material_properties:update', 'material_properties'))
  async retireMaterial(@Req() req: MaterialRequest, @Param('id') id: string) {
    const before = await this.materialsService.getMaterial(id);
    const material = await this.materialsService.retireMaterial(id, {
      orgId: req.rbac?.orgId,
      actorId: req.user?.sub,
    });

    req.setAudit?.({
      action: 'MATERIAL_RETIRED',
      resourceType: 'material',
      resourceId: material.id,
      before,
      after: material,
    });

    return { data: material };
  }

  @Post(':id/duplicate')
  @UseGuards(RbacGuard('material_properties:create', 'material_properties'))
  async duplicateMaterial(@Req() req: MaterialRequest, @Param('id') id: string) {
    const source = await this.materialsService.getMaterial(id);
    const material = await this.materialsService.duplicateMaterial(id, {
      orgId: req.rbac?.orgId,
      actorId: req.user?.sub,
    });

    req.setAudit?.({
      action: 'MATERIAL_DUPLICATED',
      resourceType: 'material',
      resourceId: material.id,
      before: source,
      after: material,
    });

    return { data: material };
  }

  @Post(':id/invalidate-cache')
  @UseGuards(RbacGuard('material_properties:update', 'material_properties'))
  async invalidateCache(@Req() req: MaterialRequest, @Param('id') id: string) {
    const result = await this.materialsService.invalidateCache(id);

    req.setAudit?.({
      action: 'MATERIAL_CACHE_INVALIDATED',
      resourceType: 'material',
      resourceId: id,
      before: null,
      after: result,
    });

    return { data: result };
  }

  @Get('families/list')
  @UseGuards(RbacGuard('material_properties:read', 'material_properties'))
  async getMaterialFamilies() {
    const families = await this.materialsService.getMaterialFamilies();
    return { data: families };
  }
}
