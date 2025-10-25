import { IsIn, IsOptional, IsString, IsUUID, MaxLength, IsUrl } from 'class-validator';

export const CMS_STATUS_VALUES = ['draft', 'review', 'published', 'archived'] as const;
export type CmsStatusValue = (typeof CMS_STATUS_VALUES)[number];

export class UpsertPageDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsString()
  @MaxLength(128)
  slug!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64000)
  content?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  hero_image?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  seo_description?: string | null;

  @IsOptional()
  @IsIn(CMS_STATUS_VALUES)
  status?: CmsStatusValue;
}

export class UpsertDocumentDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  slug?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  document_type?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  storage_path?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  @MaxLength(512)
  asset_url?: string | null;

  @IsOptional()
  @IsIn(CMS_STATUS_VALUES)
  status?: CmsStatusValue;
}
