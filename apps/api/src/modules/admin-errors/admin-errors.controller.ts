import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminErrorsService, ErrorEvent } from './admin-errors.service';
import { HeatmapCell } from '../admin-health/admin-health.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('admin/errors')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'ops')
export class AdminErrorsController {
  constructor(private readonly adminErrorsService: AdminErrorsService) {}

  @Get('heatmap')
  async getHeatmap(
    @Query('window') window: string = '1h',
  ): Promise<HeatmapCell[]> {
    return this.adminErrorsService.getErrorHeatmap(window);
  }

  @Get()
  async getErrors(
    @Query('module') module?: string,
    @Query('code') statusCode?: string,
    @Query('window') window: string = '1h',
    @Query('limit') limit: number = 100,
  ): Promise<ErrorEvent[]> {
    return this.adminErrorsService.getErrors(module, statusCode, window, limit);
  }
}
