/**
 * Step 15: Scheduler Module
 * Manages cron jobs for quote expiration and repricing
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QuoteExpirationJob } from './quote-expiration.job';
import { QuoteRevisionsModule } from "../legacy/quotes-legacy/revisions/revisions.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QuoteRevisionsModule,
    AnalyticsModule,
    ConfigModule,
  ],
  providers: [QuoteExpirationJob],
  exports: [QuoteExpirationJob],
})
export class SchedulerModule {}
