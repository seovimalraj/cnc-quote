/**
 * Routing Module (Step 10)
 */

import { Module } from '@nestjs/common';
import { RecommenderController } from './recommender.controller';
import { RecommenderService } from './recommender.service';
import { RateLimitModule } from "../../../lib/rate-limit/rate-limit.module";
import { AnalyticsModule } from "../analytics/analytics.module";

@Module({
  imports: [RateLimitModule, AnalyticsModule],
  controllers: [RecommenderController],
  providers: [RecommenderService],
  exports: [RecommenderService],
})
export class RoutingModule {}
