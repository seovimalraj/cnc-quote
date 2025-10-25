import { IsString, IsOptional, IsUUID, IsObject, IsEnum } from "class-validator";
import { QapTemplateProcessType } from "./qap.types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateQapTemplateDto {
  @ApiProperty()
  @IsString()
  orgId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  templateHtml: string;

  @ApiProperty()
  @IsObject()
  schemaJson: Record<string, unknown>;

  @ApiProperty({ enum: QapTemplateProcessType })
  @IsEnum(QapTemplateProcessType)
  processType: QapTemplateProcessType;
}

export class UpdateQapTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateHtml?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schemaJson?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: QapTemplateProcessType })
  @IsOptional()
  @IsEnum(QapTemplateProcessType)
  processType?: QapTemplateProcessType;
}

export class GenerateQapDocumentDto {
  @ApiProperty()
  @IsUUID()
  templateId: string;

  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderItemId?: string | null;

  @ApiProperty()
  @IsObject()
  documentData: Record<string, unknown>;
}

export class GenerateDfmQapDocumentDto {
  @ApiProperty()
  @IsUUID()
  dfmRequestId: string;

  @ApiProperty()
  @IsString()
  criticality: string;

  @ApiProperty()
  @IsString()
  industry: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ each: true })
  certifications?: string[];
}
