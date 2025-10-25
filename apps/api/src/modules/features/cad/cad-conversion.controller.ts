import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { CadConversionService } from './cad-conversion.service';

export interface ConvertCadRequest {
  /** URL to the CAD file */
  url: string;
  
  /** Input format */
  format: 'step' | 'stp' | 'iges' | 'igs';
  
  /** Desired output format */
  outputFormat: 'stl' | 'obj';
  
  /** Quality setting for conversion */
  quality?: 'low' | 'medium' | 'high';
}

export interface ConvertCadResponse {
  /** URL to the converted file */
  convertedUrl: string;
  
  /** Conversion metadata */
  metadata: {
    originalFormat: string;
    outputFormat: string;
    fileSize: number;
    conversionTime: number; // ms
    quality: string;
  };
}

@Controller('api/cad')
@UseGuards(JwtAuthGuard)
export class CadConversionController {
  constructor(private readonly conversionService: CadConversionService) {}

  @Post('convert')
  async convertCadFile(@Body() request: ConvertCadRequest): Promise<ConvertCadResponse> {
    const { url, format, outputFormat, quality = 'medium' } = request;
    
    if (!url || !format || !outputFormat) {
      throw new BadRequestException('Missing required fields: url, format, outputFormat');
    }
    
    const startTime = Date.now();
    
    try {
      // Call CAD service to convert file
      const convertedUrl = await this.conversionService.convert({
        url,
        inputFormat: format,
        outputFormat,
        quality,
      });
      
      const conversionTime = Date.now() - startTime;
      
      // Get file size
      const fileSize = await this.conversionService.getFileSize(convertedUrl);
      
      return {
        convertedUrl,
        metadata: {
          originalFormat: format,
          outputFormat,
          fileSize,
          conversionTime,
          quality,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
