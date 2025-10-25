import { Module } from '@nestjs/common';
import { AdminFeatureFlagsController } from './admin-feature-flags.controller';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { CacheModule } from "../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminFeatureFlagsController],
  providers: [AdminFeatureFlagsService],
  exports: [AdminFeatureFlagsService],
})
export class AdminFeatureFlagsModule {}
