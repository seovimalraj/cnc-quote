import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, IsBoolean, IsObject, IsEnum } from "class-validator";

export enum ManualReviewRuleType {
  PRICE = "price",
  FEATURE = "feature",
  MATERIAL = "material",
  QUANTITY = "quantity",
}

export enum ReviewTaskStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ReviewNotification {
  quoteId: string;
  ruleId: string;
  dueAt: Date;
  recipientEmail?: string;
  slackChannel?: string;
}

export class ManualReviewRule {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ManualReviewRuleType })
  @IsEnum(ManualReviewRuleType)
  type: ManualReviewRuleType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  slack_channel?: string;

  @ApiProperty()
  @IsNumber()
  sla_hours: number;

  @ApiProperty()
  @IsObject()
  conditions: {
    sla_hours?: number;
    threshold?: number;
    [key: string]: number | string | boolean | undefined;
  };

  @ApiProperty()
  @IsString()
  org_id: string;

  @ApiProperty({ enum: ManualReviewRuleType })
  @IsEnum(ManualReviewRuleType)
  type: ManualReviewRuleType;

  @ApiProperty()
  @IsObject()
  conditions: Record<string, unknown>;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsBoolean()
  active: boolean;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class CreateRuleDto extends ManualReviewRule {}

export class UpdateRuleDto implements Partial<ManualReviewRule> {
  @ApiProperty({ enum: ManualReviewRuleType, required: false })
  @IsEnum(ManualReviewRuleType)
  @IsOptional()
  type?: ManualReviewRuleType;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  priority?: number;
}

export class ReviewTask {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  org_id: string;

  @ApiProperty()
  @IsString()
  quote_id: string;

  @ApiProperty({ enum: ReviewTaskStatus })
  @IsEnum(ReviewTaskStatus)
  status: ReviewTaskStatus;

  @ApiProperty()
  @IsString()
  rule_id: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsObject()
  context: Record<string, unknown>;

  @ApiProperty()
  @IsOptional()
  @IsString()
  reviewer_id?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  review_notes?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  @IsOptional()
  updated_at?: Date;
}

export class GetTasksParams {
  @ApiProperty({ required: false })
  @IsEnum(ReviewTaskStatus)
  @IsOptional()
  status?: ReviewTaskStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quote_id?: string;
}

export class UpdateTaskDto {
  @ApiProperty({ enum: ReviewTaskStatus })
  @IsEnum(ReviewTaskStatus)
  status: ReviewTaskStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  review_notes?: string;
}
