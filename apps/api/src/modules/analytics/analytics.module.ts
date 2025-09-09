import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';

@Module({
  providers: [AnalyticsService, SupabaseService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
