/**
 * Step 12: Lead Time DTOs
 * Request/response validation schemas
 */

import { 
  IsUUID, 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsIn, 
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetLeadtimeDto {
  @ApiProperty({ description: 'Organization UUID' })
  @IsUUID()
  orgId: string;

  @ApiProperty({ description: 'Manufacturing process', example: 'cnc_milling' })
  @IsString()
  process: string;

  @ApiProperty({ description: 'Machine group', example: 'cnc-3axis' })
  @IsString()
  machineGroup: string;

  @ApiProperty({ description: 'Base price before lead time adjustment' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Estimated machine time in minutes' })
  @IsNumber()
  @Min(0)
  estimatedMinutes: number;

  @ApiPropertyOptional({ 
    description: 'Desired lead time class',
    enum: ['econ', 'standard', 'express'],
  })
  @IsOptional()
  @IsIn(['econ', 'standard', 'express'])
  desiredClass?: string;
}

export class CapacityEntryDto {
  @ApiProperty({ description: 'Organization UUID' })
  @IsUUID()
  orgId: string;

  @ApiProperty({ description: 'Manufacturing process' })
  @IsString()
  process: string;

  @ApiProperty({ description: 'Machine group identifier' })
  @IsString()
  machineGroup: string;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)', example: '2025-10-15' })
  @IsDateString()
  day: string;

  @ApiProperty({ description: 'Total capacity in minutes' })
  @IsInt()
  @Min(0)
  capacityMinutes: number;

  @ApiPropertyOptional({ description: 'Already booked minutes', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bookedMinutes?: number;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CapacityBulkUpsertDto {
  @ApiProperty({ 
    description: 'Array of capacity entries to upsert',
    type: [CapacityEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapacityEntryDto)
  entries: CapacityEntryDto[];
}

export class GetCapacityWindowDto {
  @ApiProperty({ description: 'Organization UUID' })
  @IsUUID()
  orgId: string;

  @ApiProperty({ description: 'Manufacturing process' })
  @IsString()
  process: string;

  @ApiProperty({ description: 'Machine group identifier' })
  @IsString()
  machineGroup: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2025-10-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2025-10-31' })
  @IsDateString()
  to: string;
}

export class CreateLeadtimeOverrideDto {
  @ApiProperty({ description: 'Organization UUID' })
  @IsUUID()
  orgId: string;

  @ApiProperty({ description: 'Manufacturing process' })
  @IsString()
  process: string;

  @ApiProperty({ description: 'Date to override (YYYY-MM-DD)', example: '2025-10-15' })
  @IsDateString()
  day: string;

  @ApiProperty({ 
    description: 'Lead time class to override',
    enum: ['econ', 'standard', 'express'],
  })
  @IsIn(['econ', 'standard', 'express'])
  class: string;

  @ApiProperty({ 
    description: 'Whether to block this class on this day',
    default: false,
  })
  @IsBoolean()
  blocked: boolean;

  @ApiPropertyOptional({ description: 'Reason for override' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateLeadtimeProfileDto {
  @ApiPropertyOptional({ description: 'Economy class days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  econDays?: number;

  @ApiPropertyOptional({ description: 'Standard class days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  stdDays?: number;

  @ApiPropertyOptional({ description: 'Express class days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expressDays?: number;

  @ApiPropertyOptional({ description: 'Surge multiplier (e.g., 1.15 = 15% increase)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  surgeMultiplier?: number;
}

export class GetLeadtimeProfileDto {
  @ApiProperty({ description: 'Organization UUID' })
  @IsUUID()
  orgId: string;

  @ApiProperty({ description: 'Manufacturing process' })
  @IsString()
  process: string;
}

// Response DTOs (no validation needed, just types)
export class LeadtimeOptionResponse {
  @ApiProperty({ enum: ['econ', 'standard', 'express'] })
  class: string;

  @ApiProperty({ description: 'Business days from today' })
  days: number;

  @ApiProperty({ description: 'Promised ship date (YYYY-MM-DD)' })
  shipDate: string;

  @ApiProperty({ description: 'Price adjustment amount' })
  priceDelta: number;

  @ApiProperty({ description: 'Whether surge pricing was applied' })
  surgeApplied: boolean;

  @ApiProperty({ description: 'P95 utilization in window (0-1)' })
  utilizationWindow: number;

  @ApiProperty({ description: 'Human-readable reasons', type: [String] })
  reasons: string[];
}

export class LeadtimeResponse {
  @ApiProperty({ type: [LeadtimeOptionResponse] })
  options: LeadtimeOptionResponse[];

  @ApiProperty({ description: 'Base price before adjustments' })
  basePrice: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiPropertyOptional({ description: 'Debug information' })
  debug?: Record<string, any>;
}

export class CapacityDayResponse {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  day: string;

  @ApiProperty({ description: 'Total capacity in minutes' })
  capacityMinutes: number;

  @ApiProperty({ description: 'Booked minutes' })
  bookedMinutes: number;

  @ApiProperty({ description: 'Utilization ratio (0-1)' })
  utilization: number;

  @ApiProperty({ description: 'Machine group' })
  machineGroup: string;

  @ApiProperty({ description: 'Manufacturing process' })
  process: string;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;
}
