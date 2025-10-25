import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
