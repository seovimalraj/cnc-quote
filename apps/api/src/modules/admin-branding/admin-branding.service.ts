import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';

export interface BrandingSettings {
  id: string;
  organization_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  custom_css: string;
  email_branding: {
    header_image_url: string;
    footer_text: string;
    signature: string;
  };
  portal_branding: {
    welcome_message: string;
    tagline: string;
    support_contact: string;
  };
  last_updated: string;
  updated_by: string;
}

export interface BrandingAsset {
  id: string;
  name: string;
  type: 'logo' | 'favicon' | 'header_image' | 'icon' | 'background';
  url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

@Injectable()
export class AdminBrandingService {
  private readonly logger = new Logger(AdminBrandingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getBrandingSettings(): Promise<BrandingSettings> {
    try {
      const { data, error } = await this.supabase.client
        .from('branding_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        this.logger.error('Failed to get branding settings', error);
        throw new BadRequestException('Failed to get branding settings');
      }

      // Return defaults if no settings exist
      if (!data) {
        return {
          id: 'default',
          organization_name: 'Your Organization',
          logo_url: '',
          favicon_url: '',
          primary_color: '#3B82F6',
          secondary_color: '#64748B',
          accent_color: '#10B981',
          font_family: 'Inter, sans-serif',
          custom_css: '',
          email_branding: {
            header_image_url: '',
            footer_text: '© 2024 Your Organization. All rights reserved.',
            signature: 'Best regards,\nYour Organization Team',
          },
          portal_branding: {
            welcome_message: 'Welcome to your portal',
            tagline: 'Manage your quotes and orders efficiently',
            support_contact: 'support@yourorganization.com',
          },
          last_updated: new Date().toISOString(),
          updated_by: 'system',
        };
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get branding settings', error);
      throw error;
    }
  }

  async updateBrandingSettings(settings: Partial<BrandingSettings>, updatedBy: string): Promise<BrandingSettings> {
    try {
      const updatedSettings = {
        ...settings,
        last_updated: new Date().toISOString(),
        updated_by: updatedBy,
      };

      const { data, error } = await this.supabase.client
        .from('branding_settings')
        .upsert(updatedSettings)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update branding settings', error);
        throw new BadRequestException('Failed to update branding settings');
      }

      // Clear cache
      await this.cache.del('branding_settings');

      return data;
    } catch (error) {
      this.logger.error('Failed to update branding settings', error);
      throw error;
    }
  }

  async uploadBrandingAsset(
    file: any,
    name: string,
    type: BrandingAsset['type'],
    uploadedBy: string,
  ): Promise<BrandingAsset> {
    try {
      // Upload file to Supabase storage
      const fileName = `${Date.now()}-${file.originalname}`;
      const { data: uploadData, error: uploadError } = await this.supabase.client.storage
        .from('branding-assets')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        this.logger.error('Failed to upload branding asset', uploadError);
        throw new BadRequestException('Failed to upload branding asset');
      }

      // Get public URL
      const { data: urlData } = this.supabase.client.storage
        .from('branding-assets')
        .getPublicUrl(fileName);

      // Save asset record
      const { data, error } = await this.supabase.client
        .from('branding_assets')
        .insert({
          name,
          type,
          url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_at: new Date().toISOString(),
          uploaded_by: uploadedBy,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to save branding asset record', error);
        throw new BadRequestException('Failed to save branding asset record');
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to upload branding asset', error);
      throw error;
    }
  }

  async getBrandingAssets(): Promise<BrandingAsset[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('branding_assets')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get branding assets', error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get branding assets', error);
      return [];
    }
  }

  async deleteBrandingAsset(assetId: string): Promise<void> {
    try {
      // Get asset details first
      const { data: asset, error: fetchError } = await this.supabase.client
        .from('branding_assets')
        .select('url')
        .eq('id', assetId)
        .single();

      if (fetchError || !asset) {
        throw new NotFoundException('Branding asset not found');
      }

      // Extract file name from URL
      const fileName = asset.url.split('/').pop();

      // Delete from storage
      if (fileName) {
        await this.supabase.client.storage
          .from('branding-assets')
          .remove([fileName]);
      }

      // Delete record
      const { error } = await this.supabase.client
        .from('branding_assets')
        .delete()
        .eq('id', assetId);

      if (error) {
        this.logger.error('Failed to delete branding asset', error);
        throw new BadRequestException('Failed to delete branding asset');
      }
    } catch (error) {
      this.logger.error('Failed to delete branding asset', error);
      throw error;
    }
  }

  async previewBrandingSettings(settings: Partial<BrandingSettings>): Promise<{
    css_variables: Record<string, string>;
    preview_html: string;
  }> {
    const currentSettings = await this.getBrandingSettings();
    const previewSettings = { ...currentSettings, ...settings };

    const cssVariables = {
      '--primary-color': previewSettings.primary_color,
      '--secondary-color': previewSettings.secondary_color,
      '--accent-color': previewSettings.accent_color,
      '--font-family': previewSettings.font_family,
    };

    const previewHtml = `
      <div style="font-family: ${previewSettings.font_family}; color: ${previewSettings.primary_color};">
        <h1>${previewSettings.organization_name}</h1>
        <p>${previewSettings.portal_branding.welcome_message}</p>
        <p>${previewSettings.portal_branding.tagline}</p>
        <button style="background-color: ${previewSettings.primary_color}; color: white; border: none; padding: 10px 20px;">
          Sample Button
        </button>
      </div>
    `;

    return {
      css_variables: cssVariables,
      preview_html: previewHtml,
    };
  }

  async resetBrandingToDefaults(updatedBy: string): Promise<BrandingSettings> {
    try {
      const defaultSettings = {
        id: 'default',
        organization_name: 'Your Organization',
        logo_url: '',
        favicon_url: '',
        primary_color: '#3B82F6',
        secondary_color: '#64748B',
        accent_color: '#10B981',
        font_family: 'Inter, sans-serif',
        custom_css: '',
        email_branding: {
          header_image_url: '',
          footer_text: '© 2024 Your Organization. All rights reserved.',
          signature: 'Best regards,\nYour Organization Team',
        },
        portal_branding: {
          welcome_message: 'Welcome to your portal',
          tagline: 'Manage your quotes and orders efficiently',
          support_contact: 'support@yourorganization.com',
        },
        last_updated: new Date().toISOString(),
        updated_by: updatedBy,
      };

      return this.updateBrandingSettings(defaultSettings, updatedBy);
    } catch (error) {
      this.logger.error('Failed to reset branding to defaults', error);
      throw error;
    }
  }

  async validateColor(color: string): Promise<boolean> {
    // Basic hex color validation
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  async getColorPalette(): Promise<{ name: string; colors: string[] }[]> {
    return [
      {
        name: 'Default',
        colors: ['#3B82F6', '#64748B', '#10B981'],
      },
      {
        name: 'Warm',
        colors: ['#F59E0B', '#EF4444', '#F97316'],
      },
      {
        name: 'Cool',
        colors: ['#06B6D4', '#3B82F6', '#6366F1'],
      },
      {
        name: 'Professional',
        colors: ['#1F2937', '#374151', '#6B7280'],
      },
    ];
  }
}
