/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SentryService implements OnModuleInit {
  onModuleInit(): void {
    // Initialization moved to main.ts
  }

  logError(error: Error, context?: Record<string, any>): void {
    console.error(error, context);
  }
}
      import * as Sentry from '@sentry/node';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SentryService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    if (dsn) {
      this.init(dsn);
    }
  }

  private init(dsn: string) {
    Sentry.init({
      dsn,
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    });
  }

  captureError(error: Error, context?: Record<string, any>) {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setExtras(context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }

  captureMessage(message: string, level: Sentry.Severity = "info") {
    Sentry.captureMessage(message, level);
  }

  startTransaction(context: { name: string; op: string; description?: string }) {
    return Sentry.startTransaction({
      name: context.name,
      op: context.op,
      description: context.description,
    });
  }
  
  configureScope(callback: (scope: Sentry.Scope) => void) {
    Sentry.configureScope(callback);
  }
}
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
    return Sentry.captureMessage(message, { level });
  }

  startTransaction(context: { name: string; op: string; description?: string }) {
    return {
      finish: () => {},
      setTag: () => {},
      setData: () => {},
      ...context
    };
  }
}
