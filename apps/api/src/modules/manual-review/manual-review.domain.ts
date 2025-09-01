import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";

export interface Quote {
  id: string;
  org_id: string;
  user_id: string;
  status: string;
  process?: string;
  features?: string[];
  quantity?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  material?: string;
}

export interface ReviewNotification {
  type: string;
  org_id: string;
  title: string;
  message: string;
  quote_id: string;
  user_id: string;
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
