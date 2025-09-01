import * as Sentry from "@sentry/node";
import { Injectable, OnModuleInit } from "@nestjs/common";

@Injectable()
export class SentryService implements OnModuleInit {
  onModuleInit() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express(),
        new Sentry.Integrations.Postgres(),
      ],
    });
  }

  captureException(error: Error, context?: Record<string, any>) {
    return Sentry.captureException(error, {
      tags: { source: "api" },
      extra: context,
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
    return Sentry.captureMessage(message, { level });
  }

  startTransaction(context: { name: string; op: string; description?: string }) {
    return Sentry.startTransaction({
      name: context.name,
      op: context.op,
      description: context.description,
    });
  }
}
