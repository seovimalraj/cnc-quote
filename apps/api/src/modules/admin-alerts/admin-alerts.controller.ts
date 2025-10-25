import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminAlertsService, AlertRule, AlertIncident, AlertChannel } from './admin-alerts.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReqUser } from '../auth/req-user.decorator';

@Controller('admin/alerts')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'ops')
export class AdminAlertsController {
  constructor(private readonly adminAlertsService: AdminAlertsService) {}

  // Alert Rules
  @Get('rules')
  async getAlertRules(): Promise<AlertRule[]> {
    return this.adminAlertsService.getAlertRules();
  }

  @Post('rules')
  async createAlertRule(
    @Body() rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<AlertRule | null> {
    return this.adminAlertsService.createAlertRule(rule);
  }

  @Put('rules/:id')
  async updateAlertRule(
    @Param('id') id: string,
    @Body() updates: Partial<AlertRule>,
  ): Promise<{ success: boolean }> {
    const success = await this.adminAlertsService.updateAlertRule(id, updates);
    return { success };
  }

  @Put('rules/:id/toggle')
  async toggleAlertRule(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.adminAlertsService.toggleAlertRule(id);
    return { success };
  }

  @Delete('rules/:id')
  async deleteAlertRule(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.adminAlertsService.deleteAlertRule(id);
    return { success };
  }

  @Post('rules/:id/test')
  async testAlertRule(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.adminAlertsService.testAlertRule(id);
    return { success };
  }

  // Alert Incidents
  @Get('incidents')
  async getAlertIncidents(): Promise<AlertIncident[]> {
    return this.adminAlertsService.getAlertIncidents();
  }

  @Put('incidents/:id/ack')
  async acknowledgeIncident(
    @Param('id') id: string,
    @ReqUser() user: any,
  ): Promise<{ success: boolean }> {
    const success = await this.adminAlertsService.acknowledgeIncident(id, user.id);
    return { success };
  }

  @Put('incidents/:id/resolve')
  async resolveIncident(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.adminAlertsService.resolveIncident(id);
    return { success };
  }

  // Alert Channels
  @Get('channels')
  async getAlertChannels(): Promise<AlertChannel[]> {
    return this.adminAlertsService.getAlertChannels();
  }

  @Post('channels')
  async createAlertChannel(
    @Body() channel: Omit<AlertChannel, 'id' | 'created_at'>,
  ): Promise<AlertChannel | null> {
    return this.adminAlertsService.createAlertChannel(channel);
  }

  @Delete('channels/:id')
  async deleteAlertChannel(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.adminAlertsService.deleteAlertChannel(id);
    return { success };
  }
}
