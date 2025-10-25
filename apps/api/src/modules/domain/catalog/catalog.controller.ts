import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from "../../core/auth/org.guard";
import { ReqUser } from "../../core/auth/req-user.decorator";

@Controller('admin/catalog')
@UseGuards(AuthGuard, OrgGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('stats')
  async getStats(@ReqUser() user: any) {
    try {
      const stats = await this.catalogService.getCatalogStats(user.org_id);
      return { data: stats };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch catalog stats', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('export')
  async exportCatalog(
    @Query('scope') scope: string,
    @ReqUser() user: any,
  ) {
    try {
      const exportData = await this.catalogService.exportCatalog(user.org_id, scope);
      return { data: exportData };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to export catalog', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('import')
  async importCatalog(
    @Body() importData: any,
    @ReqUser() user: any,
  ) {
    try {
      const results = await this.catalogService.importCatalog(user.org_id, importData, user.id);
      return { data: results };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to import catalog', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Instant Quote Catalog Endpoints (Public)
  @Get('materials')
  async getMaterials(@Query('process_type') processType?: string, @Query('available_only') availableOnly?: string) {
    try {
      const materials = await this.catalogService.getMaterials({
        process_type: processType as any,
        available_only: availableOnly === 'true',
      });
      return { data: materials };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch materials', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('finishes')
  async getFinishes(@Query('process_type') processType?: string, @Query('material_id') materialId?: string) {
    try {
      const finishes = await this.catalogService.getFinishes({
        process_type: processType as any,
        material_id: materialId,
      });
      return { data: finishes };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch finishes', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('materials/:id')
  async getMaterialById(@Query('id') id: string) {
    try {
      const material = await this.catalogService.getMaterialById(id);
      if (!material) {
        throw new HttpException('Material not found', HttpStatus.NOT_FOUND);
      }
      return { data: material };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch material', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('finishes/:id')
  async getFinishById(@Query('id') id: string) {
    try {
      const finish = await this.catalogService.getFinishById(id);
      if (!finish) {
        throw new HttpException('Finish not found', HttpStatus.NOT_FOUND);
      }
      return { data: finish };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch finish', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
