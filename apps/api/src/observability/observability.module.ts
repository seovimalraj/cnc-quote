import { Module, Global, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiLogger } from './logger.service';
import { RequestContextMiddleware } from './request-context.middleware';
import { GlobalErrorFilter } from './global-error.filter';
import { SentryService } from './sentry';

@Global()
@Module({
  providers: [
    ApiLogger,
    SentryService,
    {
      provide: APP_FILTER,
      useClass: GlobalErrorFilter,
    }
  ],
  exports: [ApiLogger, SentryService]
})
export class ObservabilityModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
