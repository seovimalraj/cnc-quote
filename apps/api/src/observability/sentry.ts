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
      extra: context,
    });
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
