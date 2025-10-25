/**
 * @ownership backend-platform
 * @raci docs/governance/raci-matrix.yaml
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import helmet from "helmet";
import * as bodyParser from "body-parser";
import timeout from "connect-timeout";
import { Request, Response, NextFunction } from "express";
// import * as Sentry from "@sentry/node";
// import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { AppModule } from "./app.module";
import { AuditInterceptor } from "./lib/common/interceptors/audit.interceptor";
import { ResponseInterceptor } from "./lib/common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./lib/common/filters/http-exception.filter";
import { AuditService } from "./modules/legacy/audit-legacy/audit.service";
import { startOTel, shutdownOTel } from "./observability/otel";
import { httpLogger } from "./observability/logger";
import { RequestContextMiddleware } from "./lib/common/middleware/request-context.middleware";
import { setupOpenAPI } from "./docs/openapi";

// Initialize Sentry
// Sentry.init({
//   dsn: process.env.SENTRY_DSN,
//   integrations: [nodeProfilingIntegration()],
//   tracesSampleRate: 1.0,
//   profilesSampleRate: 1.0,
// });

async function bootstrap() {
  // Initialize OpenTelemetry first, before any other code
  await startOTel();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until httpLogger is ready
  });

  // Disable NestJS default logger, use Pino instead
  app.useLogger(false);

  // Apply HTTP request/response logger (Pino with trace correlation)
  app.use(httpLogger);

  // Apply request context middleware (trace ID propagation, AsyncLocalStorage)
  const reqCtxMiddleware = new RequestContextMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => {
    reqCtxMiddleware.use(req, res, next);
  });

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  // Configure request size limits
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  // Configure timeout middleware
  app.use(timeout("30s"));
  app.use((req, res, next) => {
    if (!req.timedout) next();
  });

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://cnc-quote-api.onrender.com", "https://cnc-quote-cad.onrender.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: { policy: "require-corp" },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  // Apply security middleware globally
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove server information
    res.removeHeader('X-Powered-By');

    next();
  });

  // Enable CORS with app.frigate.ai domains
  app.enableCors({
    origin: [
      "https://app.frigate.ai",
      "https://app.frigate.ai/api",
      "https://app.frigate.ai/cad",
      ...(process.env.ALLOWED_ORIGINS?.split(",") || []),
      ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-Trace-Id", "X-Request-Id"],
    credentials: true,
    maxAge: 3600,
  });

  // Global validation pipe with strict settings
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  // Global exception filter (standardized error responses with requestId/traceId)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor (add requestId/traceId to success responses)
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global audit interceptor - temporarily disabled until AuditModule is added to AppModule
  // const auditService = app.get(AuditService);
  // app.useGlobalInterceptors(new AuditInterceptor(auditService));

  // Setup OpenAPI documentation (/docs and /openapi.json with sanitization)
  setupOpenAPI(app);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on port ${port}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await shutdownOTel();
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await shutdownOTel();
    await app.close();
    process.exit(0);
  });
}
bootstrap();
