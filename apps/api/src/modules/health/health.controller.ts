import { Controller, Get, Headers, Response } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Response as ExpressResponse } from 'express';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiHeader({ name: 'x-request-id', description: 'Unique request ID' })
  async check(@Response() res: ExpressResponse) {
    const requestId = uuidv4();
    const health = await this.healthService.check();

    res.setHeader('x-request-id', requestId);
    return res.json(health);
  }
}
