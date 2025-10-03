import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";
import { ContractsV1 } from '@cnc-quote/shared';

// Deprecated: Use ContractsV1.QuoteV1 instead
export type Quote = ContractsV1.QuoteV1;

export interface ReviewNotification {
  quoteId: string;
  ruleId: string;
  dueAt: Date;
  recipientEmail?: string;
  slackChannel?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
}

export class RuleConditions {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  process?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  feature?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  min_quantity?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  max_quantity?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  min_size?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  max_size?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  slack_channel?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  sla_hours?: number;
}
