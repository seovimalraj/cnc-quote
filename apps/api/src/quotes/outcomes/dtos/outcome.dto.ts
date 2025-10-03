/**
 * Step 14: Quote Outcome DTOs
 * Data transfer objects for outcome operations
 */

import { IsEnum, IsString, IsNumber, IsOptional, MaxLength, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum QuoteOutcomeStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  RESCINDED = 'rescinded',
}

export class SetOutcomeDto {
  @ApiProperty({ enum: QuoteOutcomeStatus, description: 'Outcome status' })
  @IsEnum(QuoteOutcomeStatus)
  status: QuoteOutcomeStatus;

  @ApiPropertyOptional({ description: 'Reason code from outcome_reason_codes lookup' })
  @IsString()
  @IsOptional()
  reason_code?: string;

  @ApiPropertyOptional({ description: 'Free-form notes explaining the outcome', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  reason_notes?: string;

  @ApiPropertyOptional({ description: 'Final booked amount (for accepted) or offered price (for rejected)', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Additional metadata (competitor info, currency, etc.)' })
  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;
}

export class OutcomeResponse {
  @ApiProperty({ format: 'uuid' })
  quote_id: string;

  @ApiProperty({ format: 'uuid' })
  org_id: string;

  @ApiProperty({ enum: QuoteOutcomeStatus })
  status: QuoteOutcomeStatus;

  @ApiPropertyOptional()
  reason_code?: string;

  @ApiPropertyOptional()
  reason_notes?: string;

  @ApiPropertyOptional()
  amount?: number;

  @ApiProperty({ format: 'uuid' })
  decided_by: string;

  @ApiProperty({ format: 'date-time' })
  decided_at: Date;

  @ApiProperty()
  meta: Record<string, any>;

  @ApiProperty({ format: 'date-time' })
  created_at: Date;

  @ApiProperty({ format: 'date-time' })
  updated_at: Date;
}

export class ReasonCodeDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  category: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  sort: number;
}

export class CostBreakdown {
  @ApiProperty({ description: 'Setup time cost' })
  setup_time_cost: number;

  @ApiProperty({ description: 'Machine runtime cost' })
  machine_time_cost: number;

  @ApiProperty({ description: 'Raw material cost' })
  material_cost: number;

  @ApiProperty({ description: 'Finishing cost' })
  finish_cost: number;

  @ApiProperty({ description: 'Risk markup' })
  risk_markup: number;

  @ApiProperty({ description: 'Tolerance multiplier cost' })
  tolerance_multiplier_cost: number;

  @ApiProperty({ description: 'Overhead allocation' })
  overhead_cost: number;

  @ApiProperty({ description: 'Calculated margin' })
  margin_amount: number;
}

export class LineMarginDto {
  @ApiProperty()
  line_id: string;

  @ApiProperty()
  process: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit_price: number;

  @ApiProperty({ type: CostBreakdown })
  line_cost_breakdown: CostBreakdown;

  @ApiProperty({ description: 'Margin percentage (0-1)' })
  margin_pct: number;

  @ApiProperty()
  margin_amount: number;
}

export class QuoteMarginsResponse {
  @ApiProperty()
  quote: {
    id: string;
    gross_margin_amount: number;
    gross_margin_pct: number;
  };

  @ApiProperty({ type: [LineMarginDto] })
  lines: LineMarginDto[];
}

export class ExportMarginsQueryDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  date_to?: string;

  @ApiPropertyOptional({ enum: QuoteOutcomeStatus })
  @IsOptional()
  @IsEnum(QuoteOutcomeStatus)
  status?: QuoteOutcomeStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  tags?: string[];
}
