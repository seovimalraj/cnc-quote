import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";
import { ContractsV1 } from '@cnc-quote/shared';

// Deprecated: Use ContractsV1.QuoteV1 instead. For compatibility with legacy rules, we extend with optional fields.
export type Quote = ContractsV1.QuoteV1 & {
  user_id?: string | null;
  process_type?: string | null;
  features?: string[] | null;
  quantity?: number | null;
  dimensions?: { length?: number | null; width?: number | null; height?: number | null } | null;
  material_id?: string | null;
};

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
