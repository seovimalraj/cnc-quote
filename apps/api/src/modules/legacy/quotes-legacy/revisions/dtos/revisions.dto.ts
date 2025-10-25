/**
 * Step 15: Quote Expiration & Reprice DTOs
 * Request/response types for expiration and repricing operations
 */

import { IsNumber, IsInt, IsString, IsBoolean, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingDiff } from "../entities/revision.entity";

export class ExtendExpirationDto {
  @ApiProperty({ description: 'Number of days to extend expiration', minimum: 1, maximum: 30 })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(30)
  days: number;
}

export class ExtendExpirationResponse {
  @ApiProperty()
  quote_id: string;

  @ApiProperty()
  old_expires_at: Date | null;

  @ApiProperty()
  new_expires_at: Date;

  @ApiProperty()
  extended_by_days: number;
}

export enum RepriceStrategy {
  BASELINE = 'baseline',
  NO_TAX = 'no_tax',
  WITH_TAX = 'with_tax',
}

export class RepriceDto {
  @ApiPropertyOptional({ 
    description: 'Repricing strategy', 
    enum: RepriceStrategy,
    default: RepriceStrategy.BASELINE 
  })
  @IsEnum(RepriceStrategy)
  @IsOptional()
  strategy?: RepriceStrategy = RepriceStrategy.BASELINE;

  @ApiPropertyOptional({ description: 'Dry run without persisting changes', default: false })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean = false;

  @ApiPropertyOptional({ description: 'Custom note for revision', maxLength: 500 })
  @IsString()
  @IsOptional()
  note?: string;
}

export class RepriceResponse {
  @ApiProperty({ description: 'Pricing diff showing factor-level changes' })
  diff: PricingDiff;

  @ApiProperty({ description: 'Revision ID (null if dry run)', nullable: true })
  revision_id: string | null;

  @ApiProperty({ description: 'Timestamp when repriced' })
  repriced_at: Date;

  @ApiProperty({ description: 'New quote status after reprice' })
  status: string;

  @ApiProperty({ description: 'New quote version' })
  version: number;
}

export class PricingDiffDto {
  @ApiProperty({ description: 'Absolute change in total price' })
  total_delta: number;

  @ApiProperty({ description: 'Percentage change in total price' })
  pct_delta: number;

  @ApiProperty({ description: 'Per-factor pricing changes' })
  line_items: Array<{
    factor: string;
    old: number;
    new: number;
    delta: number;
    delta_pct: number;
    reason: string | null;
  }>;

  @ApiProperty({ description: 'Change in lead time (days)', nullable: true })
  lead_time_delta_days: number | null;

  @ApiProperty({ description: 'Change in tax amount', nullable: true })
  tax_delta: number | null;

  @ApiProperty({ description: 'Warnings about pricing changes' })
  warnings: string[];

  @ApiProperty({ description: 'Old pricing version' })
  old_pricing_version: string;

  @ApiProperty({ description: 'New pricing version' })
  new_pricing_version: string;
}

export class QuoteRevisionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  quote_id: string;

  @ApiProperty({ nullable: true })
  user_id: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  diff: PricingDiffDto;

  @ApiProperty({ nullable: true })
  note: string | null;

  @ApiProperty({ nullable: true })
  restore_of_revision_id: string | null;

  @ApiProperty({ nullable: true })
  total_delta: number | null;

  @ApiProperty({ nullable: true })
  pct_delta: number | null;
}
