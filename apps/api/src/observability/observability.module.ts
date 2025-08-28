import { Module } from '@nestjs/common';
import { SentryService } from './sentry';

@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class ObservabilityModule {}
