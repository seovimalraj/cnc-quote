import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSettingsService, AuditLogEvent } from './admin-settings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('admin/settings')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'auditor')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get('audit')
  async getAuditEvents(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('actor_user_id') actorUserId?: string,
    @Query('area') area?: string[],
    @Query('action') action?: string[],
    @Query('ip') ip?: string,
    @Query('limit') limit?: number,
  ): Promise<AuditLogEvent[]> {
    return this.adminSettingsService.getAuditEvents({
      date_from: dateFrom,
      date_to: dateTo,
      actor_user_id: actorUserId,
      area,
      action,
      ip,
      limit,
    });
  }

  @Get('audit/export')
  async exportAuditEvents(
    @Query('format') format: 'csv' | 'jsonl' = 'csv',
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('actor_user_id') actorUserId?: string,
    @Query('area') area?: string[],
    @Query('action') action?: string[],
    @Query('ip') ip?: string,
    @Query('limit') limit?: number,
  ): Promise<string> {
    return this.adminSettingsService.exportAuditEvents({
      date_from: dateFrom,
      date_to: dateTo,
      actor_user_id: actorUserId,
      area,
      action,
      ip,
      limit,
    }, format);
  }
}
