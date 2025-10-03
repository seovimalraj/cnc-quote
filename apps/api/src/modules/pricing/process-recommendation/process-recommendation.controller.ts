import { Body, Controller, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProcessRecommendationRequestPayload, ProcessRecommendationResponse } from '@cnc-quote/shared';
import { ProcessRecommendationService } from './process-recommendation.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { OrgGuard } from '../../../auth/org.guard';
import { RbacGuard } from '../../../auth/rbac.middleware';

@ApiTags('pricing')
@ApiBearerAuth()
@Controller('price/process-recommendations')
@UseGuards(JwtAuthGuard, OrgGuard)
export class ProcessRecommendationController {
  constructor(private readonly recommendationService: ProcessRecommendationService) {}

  @Post()
  @UseGuards(RbacGuard('pricing:run', 'pricing'))
  @ApiOperation({
    summary: 'Generate manufacturing process recommendation',
    description: 'Evaluates rule-based heuristics to recommend an optimal manufacturing process for a part configuration.',
  })
  @ApiResponse({ status: 200, description: 'Recommendation generated successfully.' })
  async create(@Req() req: any, @Body() body: ProcessRecommendationRequestPayload): Promise<ProcessRecommendationResponse> {
    const orgId = req.rbac?.orgId;
    if (!orgId) {
      throw new BadRequestException('Missing organization context for process recommendation request');
    }
    if (!body?.part_config) {
      throw new BadRequestException('Missing part_config payload');
    }

    const traceId = this.extractTraceId(req);
    const bundle = await this.recommendationService.recommend({
      orgId,
      partConfig: body.part_config,
      geometryData: body.geometry_data,
      quoteId: body.part_config.quote_id ?? null,
      lineId: body.part_config.id ?? null,
      traceId,
      persistLog: body.persist ?? true,
      pricingSummary: null,
    });

    return { recommendation: bundle };
  }

  private extractTraceId(req: any): string | undefined {
    if (typeof req?.traceId === 'string' && req.traceId.length > 0) {
      return req.traceId;
    }
    const headers = ['x-trace-id', 'x-request-id', 'traceparent'];
    for (const header of headers) {
      const value = req?.headers?.[header];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        return value[0];
      }
    }
    return undefined;
  }
}
