import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class DfmOptionDto {
  @ApiProperty({ description: 'Option ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Option name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Option description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether option is published' })
  @IsBoolean()
  published: boolean;

  @ApiPropertyOptional({ description: 'When option was published' })
  @IsOptional()
  @IsDateString()
  publishedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: Date;
}

export class CreateDfmOptionDto {
  @ApiProperty({ description: 'Option name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Option description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether to publish immediately' })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateDfmOptionDto {
  @ApiPropertyOptional({ description: 'Option name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Option description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether option is published' })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class PublishDfmOptionsDto {
  @ApiProperty({ description: 'Option type to publish', enum: ['tolerances', 'finishes', 'industries', 'certifications', 'criticality'] })
  @IsEnum(['tolerances', 'finishes', 'industries', 'certifications', 'criticality'])
  optionType: 'tolerances' | 'finishes' | 'industries' | 'certifications' | 'criticality';

  @ApiProperty({ description: 'Option IDs to publish', type: [String] })
  @IsUUID('all', { each: true })
  optionIds: string[];
}

export class DfmRuleDto {
  @ApiProperty({ description: 'Rule ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Process type', enum: ['cnc', 'sheet_metal', 'injection_molding'] })
  @IsEnum(['cnc', 'sheet_metal', 'injection_molding'])
  processType: 'cnc' | 'sheet_metal' | 'injection_molding';

  @ApiProperty({ description: 'Rule severity', enum: ['warn', 'block'] })
  @IsEnum(['warn', 'block'])
  severity: 'warn' | 'block';

  @ApiProperty({ description: 'Rule condition expression' })
  @IsString()
  condition: string;

  @ApiProperty({ description: 'Rule message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Whether rule triggers manual review' })
  @IsBoolean()
  triggersManualReview: boolean;

  @ApiProperty({ description: 'Rule version' })
  @IsNumber()
  version: number;

  @ApiPropertyOptional({ description: 'When rule was published' })
  @IsOptional()
  @IsDateString()
  publishedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: Date;
}

export class CreateDfmRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Process type', enum: ['cnc', 'sheet_metal', 'injection_molding'] })
  @IsEnum(['cnc', 'sheet_metal', 'injection_molding'])
  processType: 'cnc' | 'sheet_metal' | 'injection_molding';

  @ApiProperty({ description: 'Rule severity', enum: ['warn', 'block'] })
  @IsEnum(['warn', 'block'])
  severity: 'warn' | 'block';

  @ApiProperty({ description: 'Rule condition expression' })
  @IsString()
  condition: string;

  @ApiProperty({ description: 'Rule message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Whether rule triggers manual review' })
  @IsOptional()
  @IsBoolean()
  triggersManualReview?: boolean;
}

export class UpdateDfmRuleDto {
  @ApiPropertyOptional({ description: 'Rule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Rule severity', enum: ['warn', 'block'] })
  @IsOptional()
  @IsEnum(['warn', 'block'])
  severity?: 'warn' | 'block';

  @ApiPropertyOptional({ description: 'Rule condition expression' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: 'Rule message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Whether rule triggers manual review' })
  @IsOptional()
  @IsBoolean()
  triggersManualReview?: boolean;
}

export class DfmInboxFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by request status' })
  @IsOptional()
  @IsEnum(['Queued', 'Analyzing', 'Complete', 'Error'])
  status?: 'Queued' | 'Analyzing' | 'Complete' | 'Error';

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by presence of blockers' })
  @IsOptional()
  @IsBoolean()
  hasBlockers?: boolean;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Limit results', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Offset for pagination', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class DfmRequestSummaryDto {
  @ApiProperty({ description: 'Request ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'Request status' })
  @IsEnum(['Queued', 'Analyzing', 'Complete', 'Error'])
  status: 'Queued' | 'Analyzing' | 'Complete' | 'Error';

  @ApiProperty({ description: 'Tolerance pack' })
  @IsString()
  tolerancePack: string;

  @ApiProperty({ description: 'Surface finish' })
  @IsString()
  surfaceFinish: string;

  @ApiProperty({ description: 'Industry' })
  @IsString()
  industry: string;

  @ApiProperty({ description: 'Criticality level' })
  @IsString()
  criticality: string;

  @ApiPropertyOptional({ description: 'User name' })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({ description: 'Check summary' })
  @IsOptional()
  checkSummary?: {
    passed: number;
    warnings: number;
    blockers: number;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: Date;
}

export class DfmRequestDetailDto {
  @ApiProperty({ description: 'Request ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'Request status' })
  @IsEnum(['Queued', 'Analyzing', 'Complete', 'Error'])
  status: 'Queued' | 'Analyzing' | 'Complete' | 'Error';

  @ApiProperty({ description: 'Tolerance pack' })
  @IsString()
  tolerancePack: string;

  @ApiProperty({ description: 'Surface finish' })
  @IsString()
  surfaceFinish: string;

  @ApiProperty({ description: 'Industry' })
  @IsString()
  industry: string;

  @ApiProperty({ description: 'Criticality level' })
  @IsString()
  criticality: string;

  @ApiProperty({ description: 'Certifications', type: [String] })
  certifications: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'User information' })
  @IsOptional()
  user?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Organization information' })
  @IsOptional()
  organization?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'DFM results' })
  @IsOptional()
  results?: {
    summary: {
      passed: number;
      warnings: number;
      blockers: number;
    };
    checks: Array<{
      id: string;
      name: string;
      status: 'pass' | 'warning' | 'blocker';
      message: string;
      category: string;
      severity: string;
    }>;
    viewerMeshId?: string;
    reportPdfId?: string;
    qapPdfId?: string;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: Date;
}
