import { IsString, IsNumber, IsObject, IsOptional } from "class-validator";

export class CreateQuoteDto {
  @IsString()
  process_type: string;

  @IsString()
  material_id: string;

  @IsNumber()
  quantity: number;

  @IsObject()
  dimensions: {
    volume_cc?: number;
    surface_area_cm2?: number;
    thickness_mm?: number;
    sheet_area_cm2?: number;
  };

  @IsObject()
  features: {
    holes?: number;
    pockets?: number;
    slots?: number;
    faces?: number;
    bends?: number;
    corners?: number;
  };

  @IsNumber()
  @IsOptional()
  complexity_multiplier?: number;
}

export class UpdateQuoteDto extends CreateQuoteDto {
  @IsString()
  @IsOptional()
  status?: string;
}
