import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AdminSystemService } from './admin-system.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('admin/system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSystemController {
  private readonly logger = new Logger(AdminSystemController.name);

  constructor(private readonly adminSystemService: AdminSystemService) {}

  @Get('health/summary')
  @HttpCode(HttpStatus.OK)
  async getSystemHealthSummary(): Promise<any> {
    this.logger.log('Getting system health summary');
    return this.adminSystemService.getSystemHealthSummary();
  }

  @Get('legal/:type')
  @HttpCode(HttpStatus.OK)
  async getLegalDocument(@Param('type') type: string): Promise<any> {
    this.logger.log(`Getting legal document: ${type}`);
    return this.adminSystemService.getLegalDocument(type);
  }

  @Get('legal')
  @HttpCode(HttpStatus.OK)
  async getAllLegalDocuments(): Promise<any> {
    this.logger.log('Getting all legal documents');
    return this.adminSystemService.getAllLegalDocuments();
  }
}

// Additional controller for system-health endpoint (accessible without admin role for monitoring)
@Controller('admin/system-health')
export class AdminSystemHealthController {
  private readonly logger = new Logger(AdminSystemHealthController.name);

  constructor(private readonly adminSystemService: AdminSystemService) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  async getSystemHealthSummary(): Promise<any> {
    this.logger.log('Getting system health summary (public endpoint)');
    return this.adminSystemService.getSystemHealthSummary();
  }
}
