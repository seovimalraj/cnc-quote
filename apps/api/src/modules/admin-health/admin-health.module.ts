import { Module } from '@nestjs/common';
import { AdminHealthController } from './admin-health.controller';
import { AdminHealthService } from './admin-health.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminHealthController],
  providers: [AdminHealthService],
  exports: [AdminHealthService],
})
export class AdminHealthModule {}
