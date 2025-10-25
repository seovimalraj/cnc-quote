import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const MATERIAL_CODE_REGEX = /^[A-Z0-9_\-\.]{3,64}$/;
const REGION_ENUM = ['US', 'EU', 'IN', 'UK', 'CA', 'AU'] as const;

export class RegionMultiplierDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Array.from(REGION_ENUM))
  region!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(10)
  multiplier!: number;
}

export class CreateMaterialDto {
  @IsString()
  @Matches(MATERIAL_CODE_REGEX)
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(/^[A-Z]{2,8}$/)
  category_code!: string;

  @IsOptional()
  @IsString()
  standard?: string;

  @IsOptional()
  @IsObject()
  composition_json?: Record<string, unknown>;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(50)
  @Max(25000)
  density_kg_m3!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(100)
  machinability_index!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { each: false })
  hardness_hb?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { each: false })
  tensile_mpa?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { each: false })
  melting_c?: number | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000)
  cost_per_kg_base!: number;

  @IsOptional()
  @IsString()
  supplier_ref?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  processes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  available_regions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegionMultiplierDto)
  @ArrayMaxSize(32)
  region_multipliers?: RegionMultiplierDto[];
}

export const REGION_WHITELIST = new Set<string>(REGION_ENUM);
export const MATERIAL_CODE_PATTERN = MATERIAL_CODE_REGEX;
