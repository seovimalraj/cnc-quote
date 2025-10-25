import { Module } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { CacheModule } from "../../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}
