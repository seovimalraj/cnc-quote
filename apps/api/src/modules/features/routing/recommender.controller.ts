/**
 * Process Recommendation Controller (Step 10)
 * POST /routing/recommend with RBAC: quotes:read
 */

import { Body, Controller, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { OrgGuard } from "../../core/auth/org.guard";
import { RbacGuard } from "../../core/auth/rbac.middleware";
import { RecommenderService } from './recommender.service';
import { RecommendRequest, ProcessRecommendationResponse } from './types';
import { RecommendRequestSchema } from './validation';
import { RateLimitService } from "../../../lib/rate-limit/rate-limit.service";
import { CacheService } from "../../../lib/cache/cache.service";

@ApiTags('routing')
@ApiBearerAuth()
@Controller('routing')
@UseGuards(JwtAuthGuard, OrgGuard)
export class RecommenderController {
  constructor(
    private readonly recommenderService: RecommenderService,
    private readonly rateLimit: RateLimitService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  @Post('recommend')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({
    summary: 'Generate process recommendations',
    description: 'Rule-driven process recommendation for a quote/part based on geometry and config',
  })
  @ApiResponse({ status: 200, description: 'Recommendations generated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (quotes:read required)' })
  async recommend(@Req() req: any, @Body() body: RecommendRequest): Promise<ProcessRecommendationResponse> {
    // Feature flag check
    const enabled = this.config.get<boolean>('PROCESS_RECOMMENDER_ENABLED', true);
    if (!enabled) {
      throw new BadRequestException('Process recommendation feature is disabled');
    }

    const orgId = req.rbac?.orgId;
    if (!orgId) {
      throw new BadRequestException('Missing organization context');
    }

    // Validate request
    const validated = RecommendRequestSchema.parse(body);

    // Rate limiting: 10 req/min per org
    const rateLimitKey = `process_rec:${orgId}`;
    const rateLimitResult = await this.rateLimit.checkRateLimit(rateLimitKey, 'routing_recommend', { limit: 10, windowMinutes: 1 });
    if (!rateLimitResult.allowed) {
      throw new BadRequestException('Rate limit exceeded (10 req/min)');
    }

    // Cache check (15 min TTL)
    const cacheKey = `recommendation:${validated.quote_id}:${validated.part_id}`;
    const cached = await this.cache.get<ProcessRecommendationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const traceId = this.extractTraceId(req);
    const result = await this.recommenderService.recommendProcesses(validated, orgId, traceId);

    // Cache result
    await this.cache.set(cacheKey, result, 15 * 60);

    return result;
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
