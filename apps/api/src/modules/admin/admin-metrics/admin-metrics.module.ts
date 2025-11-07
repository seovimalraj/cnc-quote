import { Module } from '@nestjs/common';
import { AdminMetricsController } from './admin-metrics.controller';
import { AdminMetricsService } from './admin-metrics.service';
// CacheModule not imported - it's @Global in app.module

@Module({
  imports: [], // SupabaseModule removed - it's @Global  // CacheModule removed - it's global
  controllers: [AdminMetricsController],
  providers: [AdminMetricsService],
  exports: [AdminMetricsService],
})
export class AdminMetricsModule {}
