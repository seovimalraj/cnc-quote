import { Module } from '@nestjs/common';
import { AdminAlertsController } from './admin-alerts.controller';
import { AdminAlertsService } from './admin-alerts.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { CacheModule } from '../../lib/cache/cache.module';

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [AdminAlertsController],
  providers: [AdminAlertsService],
  exports: [AdminAlertsService],
})
export class AdminAlertsModule {}
