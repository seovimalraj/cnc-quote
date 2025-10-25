import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  AdminComplianceService,
  ComplianceSettings,
  ExportControlReview,
  ComplianceViolation,
  ComplianceReport,
} from './admin-compliance.service';
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { RolesGuard } from "../../core/auth/roles.guard";
import { Roles } from "../../core/auth/roles.decorator";

@Controller('admin/compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'org_admin')
export class AdminComplianceController {
  private readonly logger = new Logger(AdminComplianceController.name);

  constructor(private readonly complianceService: AdminComplianceService) {}

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  async getComplianceSettings(): Promise<ComplianceSettings> {
    this.logger.log('Getting compliance settings');
    return this.complianceService.getComplianceSettings();
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  async updateComplianceSettings(
    @Body() body: { settings: Partial<ComplianceSettings>; updatedBy: string },
  ): Promise<ComplianceSettings> {
    this.logger.log('Updating compliance settings');
    return this.complianceService.updateComplianceSettings(body.settings, body.updatedBy);
  }

  @Get('export-reviews')
  @HttpCode(HttpStatus.OK)
  async getExportControlReviews(
    @Query() query: { status?: string; country?: string; reviewer?: string },
  ): Promise<ExportControlReview[]> {
    this.logger.log('Getting export control reviews');
    return this.complianceService.getExportControlReviews(query);
  }

  @Post('export-reviews')
  @HttpCode(HttpStatus.CREATED)
  async submitExportControlReview(
    @Body() body: {
      quote_id: string;
      user_id: string;
      destination_country: string;
      product_category: string;
      export_control_classification: string;
    },
  ): Promise<ExportControlReview> {
    this.logger.log('Submitting export control review');
    return this.complianceService.submitExportControlReview(body);
  }

  @Put('export-reviews/:reviewId')
  @HttpCode(HttpStatus.OK)
  async reviewExportControl(
    @Param('reviewId') reviewId: string,
    @Body() body: { status: 'approved' | 'rejected' | 'escalated'; reviewerId: string; notes?: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Reviewing export control ${reviewId}`);
    await this.complianceService.reviewExportControl(reviewId, body.status, body.reviewerId, body.notes);
    return { success: true, message: 'Export control reviewed successfully' };
  }

  @Get('violations')
  @HttpCode(HttpStatus.OK)
  async getComplianceViolations(
    @Query() query: { resolved?: boolean; severity?: string; type?: string },
  ): Promise<ComplianceViolation[]> {
    this.logger.log('Getting compliance violations');
    return this.complianceService.getComplianceViolations(query);
  }

  @Put('violations/:violationId/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveViolation(
    @Param('violationId') violationId: string,
    @Body() body: { resolutionNotes: string; resolvedBy: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Resolving violation ${violationId}`);
    await this.complianceService.resolveViolation(violationId, body.resolutionNotes, body.resolvedBy);
    return { success: true, message: 'Violation resolved successfully' };
  }

  @Get('report')
  @HttpCode(HttpStatus.OK)
  async getComplianceReport(): Promise<ComplianceReport> {
    this.logger.log('Getting compliance report');
    return this.complianceService.getComplianceReport();
  }

  @Post('check-country')
  @HttpCode(HttpStatus.OK)
  async checkCountryRestriction(
    @Body() body: { countryCode: string },
  ): Promise<{ restricted: boolean; message: string }> {
    this.logger.log(`Checking country restriction for ${body.countryCode}`);
    const restricted = await this.complianceService.checkCountryRestriction(body.countryCode);
    return {
      restricted,
      message: restricted ? 'Country is restricted' : 'Country is not restricted',
    };
  }

  @Get('restricted-countries')
  @HttpCode(HttpStatus.OK)
  async getRestrictedCountries(): Promise<string[]> {
    this.logger.log('Getting restricted countries');
    const settings = await this.complianceService.getComplianceSettings();
    return settings.restricted_countries;
  }

  @Post('log-event')
  @HttpCode(HttpStatus.OK)
  async logComplianceEvent(
    @Body() body: {
      user_id: string;
      event_type: string;
      description: string;
      ip_address?: string;
      user_agent?: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Logging compliance event');
    await this.complianceService.logComplianceEvent(body);
    return { success: true, message: 'Compliance event logged successfully' };
  }
}
