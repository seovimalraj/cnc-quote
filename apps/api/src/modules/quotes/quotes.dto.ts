import { IsString, IsNumber, IsUUID, IsOptional, IsArray } from "class-validator";

export class CreateQuoteDto {
  @IsUUID()
  org_id: string;

  @IsUUID()
  customer_id: string;

  @IsUUID()
  price_profile_id: string;

  @IsUUID()
  @IsOptional()
  dfm_ruleset_id?: string;

  @IsNumber()
  total_amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  terms?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  items: CreateQuoteItemDto[];
}

export class CreateQuoteItemDto {
  @IsUUID()
  file_id: string;

  @IsString()
  process_type: string;

  @IsUUID()
  material_id: string;

  @IsArray()
  @IsOptional()
  finish_ids?: string[];

  @IsString()
  @IsOptional()
  tolerance?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unit_price: number;

  @IsNumber()
  total_price: number;

  @IsNumber()
  lead_time_days: number;

  @IsNumber()
  @IsOptional()
  complexity_multiplier?: number;
}

export class UpdateQuoteDto {
  @IsString()
  @IsOptional()
  status?: "draft" | "sent" | "accepted" | "rejected" | "expired";

  @IsNumber()
  @IsOptional()
  total_amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  terms?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  items?: CreateQuoteItemDto[];

  @IsOptional()
  acceptedAt?: Date;

  @IsOptional()
  rejectedAt?: Date;

  @IsOptional()
  email_sent_at?: Date;
}
