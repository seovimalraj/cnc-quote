import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateLeadDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  dfm_request_id?: string;
}
