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
import { OrgGuard } from '../../auth/org.guard';
import { ReqUser } from '../../auth/req-user.decorator';

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
}
