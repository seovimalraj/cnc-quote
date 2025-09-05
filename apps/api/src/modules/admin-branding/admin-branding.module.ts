import { Module } from '@nestjs/common';
import { AdminBrandingController } from './admin-branding.controller';
import { AdminBrandingService } from './admin-branding.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminBrandingController],
  providers: [AdminBrandingService],
  exports: [AdminBrandingService],
})
export class AdminBrandingModule {}
