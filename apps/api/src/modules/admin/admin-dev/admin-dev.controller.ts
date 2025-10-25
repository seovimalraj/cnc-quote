import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Header,
} from '@nestjs/common';
import { AdminDevService } from './admin-dev.service';
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { RolesGuard } from "../../core/auth/roles.guard";
import { Roles } from "../../core/auth/roles.decorator";

@Controller('admin/dev')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDevController {
  private readonly logger = new Logger(AdminDevController.name);

  constructor(private readonly adminDevService: AdminDevService) {}

  @Get('env')
  @HttpCode(HttpStatus.OK)
  async getEnvironmentOverview(): Promise<any> {
    this.logger.log('Getting environment overview');
    return this.adminDevService.getEnvironmentOverview();
  }

  @Get('/api-json')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="openapi.json"')
  async getOpenApiJson(): Promise<any> {
    this.logger.log('Getting OpenAPI JSON');
    return this.adminDevService.getOpenApiJson();
  }

  @Get('/api-yaml')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/x-yaml')
  @Header('Content-Disposition', 'attachment; filename="openapi.yaml"')
  async getOpenApiYaml(): Promise<string> {
    this.logger.log('Getting OpenAPI YAML');
    return this.adminDevService.getOpenApiYaml();
  }

  @Get('/cad/openapi.json')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="cad-openapi.json"')
  async getCadOpenApiJson(): Promise<any> {
    this.logger.log('Getting CAD OpenAPI JSON');
    return this.adminDevService.getCadOpenApiJson();
  }

  @Post('test-webhook')
  @HttpCode(HttpStatus.OK)
  async sendTestWebhook(
    @Body() body: {
      provider: 'Stripe' | 'PayPal';
      event_type: string;
      payload: any;
      signature_mode: 'auto' | 'unsigned';
      user_id: string;
      ip_address: string;
    },
  ): Promise<any> {
    this.logger.log(`Sending test webhook: ${body.provider} ${body.event_type}`);
    return this.adminDevService.sendTestWebhook(
      body.provider,
      body.event_type,
      body.payload,
      body.signature_mode,
      body.user_id,
      body.ip_address,
    );
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedSampleData(
    @Body() body: {
      entities: string[];
      with_cad_jobs: boolean;
      with_payments: boolean;
      user_id: string;
      ip_address: string;
    },
  ): Promise<any> {
    this.logger.log('Seeding sample data');
    return this.adminDevService.seedSampleData(
      body.entities,
      body.with_cad_jobs,
      body.with_payments,
      body.user_id,
      body.ip_address,
    );
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(
    @Body() body: {
      template: string;
      to: string;
      user_id: string;
      ip_address: string;
    },
  ): Promise<any> {
    this.logger.log(`Sending test email: ${body.template} to ${body.to}`);
    return this.adminDevService.sendTestEmail(
      body.template,
      body.to,
      body.user_id,
      body.ip_address,
    );
  }

  @Post('enqueue')
  @HttpCode(HttpStatus.OK)
  async enqueueTestJob(
    @Body() body: {
      job: string;
      payload: any;
      user_id: string;
      ip_address: string;
    },
  ): Promise<any> {
    this.logger.log(`Enqueuing test job: ${body.job}`);
    return this.adminDevService.enqueueTestJob(
      body.job,
      body.payload,
      body.user_id,
      body.ip_address,
    );
  }

  @Get('/queues/status')
  @HttpCode(HttpStatus.OK)
  async getQueueStatus(): Promise<any> {
    this.logger.log('Getting queue status');
    return this.adminDevService.getQueueStatus();
  }
}
