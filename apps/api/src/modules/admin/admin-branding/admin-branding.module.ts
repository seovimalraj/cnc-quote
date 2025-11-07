import { Module } from '@nestjs/common';
import { AdminBrandingController } from './admin-branding.controller';
import { AdminBrandingService } from './admin-branding.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [AdminBrandingController],
  providers: [AdminBrandingService],
  exports: [AdminBrandingService],
})
export class AdminBrandingModule {}
