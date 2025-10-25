import pino from 'pino';
import pinoHttp from 'pino-http';
import { getReqCtx } from '../common/middleware/request-context.middleware';

// PII redaction patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /\b(\+?1?[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?[\d]{3}[-.\s]?[\d]{4}\b/g,
  token: /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
  password: /"password"\s*:\s*"[^"]+"/gi,
  address: /\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  file_path: /\/(?:home|Users)\/[^\s]+/g,
};

function redactPII(obj: any): any {
  if (typeof obj === 'string') {
    let redacted = obj;
    Object.values(PII_PATTERNS).forEach((pattern) => {
      redacted = redacted.replace(pattern, '<redacted>');
    });
    return redacted;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }
  if (obj && typeof obj === 'object') {
    const redacted: any = {};
    Object.keys(obj).forEach((key) => {
      redacted[key] = redactPII(obj[key]);
    });
    return redacted;
  }
  return obj;
}

// Pino logger with trace correlation
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    // Add trace context from AsyncLocalStorage to every log
    log(object) {
      const ctx = getReqCtx();
      return {
        ...object,
        ...(ctx?.traceId && { traceId: ctx.traceId }),
        ...(ctx?.spanId && { spanId: ctx.spanId }),
        ...(ctx?.requestId && { requestId: ctx.requestId }),
        ...(ctx?.orgId && { orgId: ctx.orgId }),
        ...(ctx?.userId && { userId: ctx.userId }),
      };
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        ...req.headers,
        authorization: '<redacted>',
        cookie: '<redacted>',
        'x-api-key': '<redacted>',
        'x-auth-token': '<redacted>',
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders ? res.getHeaders() : {},
    }),
    err: pino.stdSerializers.err,
  },
  // Remove pino-pretty transport to fix pino-http compatibility issue
  // ...(process.env.NODE_ENV === 'development'
  //   ? {
  //       transport: {
  //         target: 'pino-pretty',
  //         options: {
  //           colorize: true,
  //           translateTime: 'SYS:standard',
  //           ignore: 'pid,hostname',
  //         },
  //       },
  //     }
  //   : {}),
});

// Pino HTTP middleware
export const httpLogger = pinoHttp({
  logger: logger as any, // Type cast to avoid pino-http version incompatibility
  // Disabled customProps to fix pino-http compatibility issue
  // The trace context is already added via logger.formatters.log
  // customProps: (req: any) => {
  //   const ctx = getReqCtx();
  //   return {
  //     traceId: ctx?.traceId,
  //     spanId: ctx?.spanId,
  //     requestId: ctx?.requestId,
  //     orgId: ctx?.orgId,
  //     userId: ctx?.userId,
  //   };
  // },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration_ms',
  },
  autoLogging: {
    ignore: (req) => {
      // Don't log health checks or metrics endpoints
      return req.url === '/health' || req.url === '/metrics';
    },
  },
});

// Convenience functions for logging
export function log(message: string, context?: Record<string, any>) {
  logger.info(redactPII(context), message);
}

export function logInfo(message: string, context?: Record<string, any>) {
  logger.info(redactPII(context), message);
}

export function logWarn(message: string, context?: Record<string, any>) {
  logger.warn(redactPII(context), message);
}

export function logError(message: string, error?: Error, context?: Record<string, any>) {
  logger.error(
    {
      err: error,
      ...redactPII(context),
    },
    message,
  );
}

export function logDebug(message: string, context?: Record<string, any>) {
  logger.debug(redactPII(context), message);
}

// Log duration of an operation
export function logDuration(operation: string, durationMs: number, context?: Record<string, any>) {
  logger.info(
    {
      operation,
      duration_ms: durationMs,
      ...redactPII(context),
    },
    `${operation} completed`,
  );
}

// Create child logger with bound context
export function createChildLogger(context: Record<string, any>) {
  return logger.child(redactPII(context));
}

export { logger };