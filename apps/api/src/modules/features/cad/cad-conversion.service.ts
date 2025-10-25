import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export interface ConversionOptions {
  url: string;
  inputFormat: 'step' | 'stp' | 'iges' | 'igs';
  outputFormat: 'stl' | 'obj';
  quality: 'low' | 'medium' | 'high';
}

@Injectable()
export class CadConversionService {
  private readonly logger = new Logger(CadConversionService.name);
  private readonly cadServiceUrl: string;
  private readonly supabase: ReturnType<typeof createClient>;

  constructor(private configService: ConfigService) {
    this.cadServiceUrl = this.configService.get<string>('CAD_SERVICE_URL') || 'http://localhost:8001';
    
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL')!;
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Convert CAD file to target format
   */
  async convert(options: ConversionOptions): Promise<string> {
    const { url, inputFormat, outputFormat, quality } = options;
    
    this.logger.log(`Converting ${inputFormat} to ${outputFormat} (quality: ${quality})`);
    
    try {
      // Download original file
      const fileBuffer = await this.downloadFile(url);
      
      // Call Python CAD service for conversion
      const convertedBuffer = await this.callCadService(fileBuffer, inputFormat, outputFormat, quality);
      
      // Upload converted file to Supabase Storage
      const convertedUrl = await this.uploadConvertedFile(convertedBuffer, outputFormat);
      
      this.logger.log(`Conversion complete: ${convertedUrl}`);
      
      return convertedUrl;
    } catch (error) {
      this.logger.error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        'CAD conversion failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException('Failed to download file', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Call Python CAD service for conversion
   */
  private async callCadService(
    fileBuffer: Buffer,
    inputFormat: string,
    outputFormat: string,
    quality: string
  ): Promise<Buffer> {
    try {
      // Create form data
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, `model.${inputFormat}`);
      formData.append('output_format', outputFormat);
      formData.append('quality', quality);
      
      // Quality settings map to tessellation parameters
      const qualitySettings = {
        low: { linear_deflection: 1.0, angular_deflection: 0.5 },
        medium: { linear_deflection: 0.1, angular_deflection: 0.1 },
        high: { linear_deflection: 0.01, angular_deflection: 0.05 },
      };
      
      const settings = qualitySettings[quality];
      formData.append('linear_deflection', settings.linear_deflection.toString());
      formData.append('angular_deflection', settings.angular_deflection.toString());
      
      const response = await axios.post(
        `${this.cadServiceUrl}/api/convert`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'arraybuffer',
          timeout: 120000, // 2 minutes for complex models
        }
      );
      
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`CAD service call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new HttpException('CAD service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (error.response?.status === 400) {
          throw new HttpException('Invalid CAD file', HttpStatus.BAD_REQUEST);
        }
      }
      
      throw new HttpException('CAD conversion failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Upload converted file to Supabase Storage
   */
  private async uploadConvertedFile(
    fileBuffer: Buffer,
    format: string
  ): Promise<string> {
    try {
      const fileName = `converted-${Date.now()}.${format}`;
      const filePath = `cad-conversions/${fileName}`;
      
      const { data, error } = await this.supabase.storage
        .from('uploads')
        .upload(filePath, fileBuffer, {
          contentType: format === 'stl' ? 'application/sla' : 'text/plain',
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload converted file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException('Failed to upload converted file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get file size from URL
   */
  async getFileSize(url: string): Promise<number> {
    try {
      const response = await axios.head(url);
      return parseInt(response.headers['content-length'] || '0', 10);
    } catch (error) {
      this.logger.warn(`Failed to get file size: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }
}
