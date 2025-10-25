import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AdminBrandingService,
  BrandingSettings,
  BrandingAsset,
} from './admin-branding.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/branding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'org_admin')
export class AdminBrandingController {
  private readonly logger = new Logger(AdminBrandingController.name);

  constructor(private readonly brandingService: AdminBrandingService) {}

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  async getBrandingSettings(): Promise<BrandingSettings> {
    this.logger.log('Getting branding settings');
    return this.brandingService.getBrandingSettings();
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  async updateBrandingSettings(
    @Body() body: { settings: Partial<BrandingSettings>; updatedBy: string },
  ): Promise<BrandingSettings> {
    this.logger.log('Updating branding settings');
    return this.brandingService.updateBrandingSettings(body.settings, body.updatedBy);
  }

  @Post('assets')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadBrandingAsset(
    @UploadedFile() file: any,
    @Body() body: { name: string; type: BrandingAsset['type']; uploadedBy: string },
  ): Promise<BrandingAsset> {
    this.logger.log('Uploading branding asset');
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.brandingService.uploadBrandingAsset(file, body.name, body.type, body.uploadedBy);
  }

  @Get('assets')
  @HttpCode(HttpStatus.OK)
  async getBrandingAssets(): Promise<BrandingAsset[]> {
    this.logger.log('Getting branding assets');
    return this.brandingService.getBrandingAssets();
  }

  @Delete('assets/:assetId')
  @HttpCode(HttpStatus.OK)
  async deleteBrandingAsset(@Param('assetId') assetId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deleting branding asset ${assetId}`);
    await this.brandingService.deleteBrandingAsset(assetId);
    return { success: true, message: 'Branding asset deleted successfully' };
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewBrandingSettings(
    @Body() body: { settings: Partial<BrandingSettings> },
  ): Promise<{ css_variables: Record<string, string>; preview_html: string }> {
    this.logger.log('Previewing branding settings');
    return this.brandingService.previewBrandingSettings(body.settings);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetBrandingToDefaults(
    @Body() body: { updatedBy: string },
  ): Promise<BrandingSettings> {
    this.logger.log('Resetting branding to defaults');
    return this.brandingService.resetBrandingToDefaults(body.updatedBy);
  }

  @Post('validate-color')
  @HttpCode(HttpStatus.OK)
  async validateColor(@Body() body: { color: string }): Promise<{ valid: boolean; message: string }> {
    this.logger.log(`Validating color ${body.color}`);
    const valid = await this.brandingService.validateColor(body.color);
    return {
      valid,
      message: valid ? 'Color is valid' : 'Invalid color format. Use hex format like #FF0000',
    };
  }

  @Get('color-palettes')
  @HttpCode(HttpStatus.OK)
  async getColorPalettes(): Promise<{ name: string; colors: string[] }[]> {
    this.logger.log('Getting color palettes');
    return this.brandingService.getColorPalette();
  }

  @Get('fonts')
  @HttpCode(HttpStatus.OK)
  async getAvailableFonts(): Promise<string[]> {
    this.logger.log('Getting available fonts');
    return [
      'Inter, sans-serif',
      'Roboto, sans-serif',
      'Open Sans, sans-serif',
      'Lato, sans-serif',
      'Poppins, sans-serif',
      'Montserrat, sans-serif',
      'Nunito, sans-serif',
      'Source Sans Pro, sans-serif',
      'Ubuntu, sans-serif',
      'Roboto Condensed, sans-serif',
    ];
  }
}
