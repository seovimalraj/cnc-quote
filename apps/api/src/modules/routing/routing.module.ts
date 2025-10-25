/**
 * Routing Module (Step 10)
 */

import { Module } from '@nestjs/common';
import { RecommenderController } from './recommender.controller';
import { RecommenderService } from './recommender.service';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { RateLimitModule } from '../../lib/rate-limit/rate-limit.module';
import { CacheModule } from '../../lib/cache/cache.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [SupabaseModule, RateLimitModule, CacheModule, AnalyticsModule],
  controllers: [RecommenderController],
  providers: [RecommenderService],
  exports: [RecommenderService],
})
export class RoutingModule {}
