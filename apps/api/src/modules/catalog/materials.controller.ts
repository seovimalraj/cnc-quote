import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from '../../auth/org.guard';
import { ReqUser } from '../../auth/req-user.decorator';
import { Material } from '../../../../../packages/shared/src/types/schema';

@Controller('admin/materials')
@UseGuards(AuthGuard, OrgGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async getMaterials(
    @Query() filters: any,
    @ReqUser() user: any,
  ) {
    try {
      const materials = await this.materialsService.getMaterials(user.org_id, filters);
      return { data: materials };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch materials', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getMaterial(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const material = await this.materialsService.getMaterial(id, user.org_id);
      if (!material) {
        throw new HttpException('Material not found', HttpStatus.NOT_FOUND);
      }
      return { data: material };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { error: 'Failed to fetch material', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createMaterial(
    @Body() materialData: Partial<Material>,
    @ReqUser() user: any,
  ) {
    try {
      const material = await this.materialsService.createMaterial(materialData, user.org_id, user.id);
      return { data: material };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create material', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateMaterial(
    @Param('id') id: string,
    @Body() updates: Partial<Material>,
    @ReqUser() user: any,
  ) {
    try {
      const material = await this.materialsService.updateMaterial(id, updates, user.id);
      return { data: material };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to update material', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/retire')
  async retireMaterial(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const material = await this.materialsService.retireMaterial(id, user.id);
      return { data: material };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to retire material', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/duplicate')
  async duplicateMaterial(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const material = await this.materialsService.duplicateMaterial(id, user.org_id, user.id);
      return { data: material };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to duplicate material', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/invalidate-cache')
  async invalidateCache(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.materialsService.invalidateCache(id, user.id);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to invalidate cache', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('families/list')
  async getMaterialFamilies() {
    try {
      const families = await this.materialsService.getMaterialFamilies();
      return { data: families };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch material families', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
