import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
