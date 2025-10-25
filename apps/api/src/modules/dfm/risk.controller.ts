import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested, IsNumber } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrgGuard } from '../auth/org.guard';
import { RiskService } from './risk.service';
import { RiskComputeInput } from './risk.model';

class ToleranceDto {
  @IsOptional()
  @IsString()
  feature?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @Type(() => Number)
  @IsNumber()
  value_mm!: number;
}

class RiskComputeDto {
  @IsOptional()
  @IsUUID('4')
  orgId?: string;

  @IsUUID('4')
  quoteId!: string;

  @IsUUID('4')
  lineId!: string;

  @IsString()
  process!: string;

  @IsString()
  geometryId!: string;

  @IsOptional()
  @IsString()
  materialCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToleranceDto)
  tolerances?: ToleranceDto[];
}

@Controller('api/dfm/risk')
@UseGuards(JwtAuthGuard, OrgGuard)
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Post('compute')
  async compute(@Req() req: any, @Body() body: RiskComputeDto) {
    const orgId = body.orgId || req.rbac?.orgId;
    if (!orgId) {
      throw new BadRequestException('orgId required');
    }

    const input: RiskComputeInput = {
      orgId,
      quoteId: body.quoteId,
      lineId: body.lineId,
      process: body.process,
      geometryId: body.geometryId,
      materialCode: body.materialCode,
      tolerances: body.tolerances,
    };

    const { result, pricing } = await this.risk.computeAndPersist(input);

    return {
      score: result.score,
      severity: result.severity,
      vector: result.vector,
      issueTags: result.tags,
      contributions: result.contributions,
      pricingEffect: pricing,
    };
  }

  @Get(':quoteId/:lineId')
  async getLatest(@Req() req: any, @Param('quoteId') quoteId: string, @Param('lineId') lineId: string) {
    const orgId = req.rbac?.orgId;
    if (!orgId) {
      throw new BadRequestException('orgId required');
    }

    const history = await this.risk.getHistory(orgId, quoteId, lineId);
    const latest = history?.[0] ?? null;
    return { latest, history };
  }
}

