/**
 * Step 18 + 19: Logger
 * Structured logging with Pino and trace correlation
 */

import pino from 'pino';
import { context, trace } from '@opentelemetry/api';
import { config } from '../config';

/**
 * Get trace context for logging
 */
function getTraceContext() {
  const span = trace.getSpan(context.active());
  if (!span) return {};
  
  const spanContext = span.spanContext();
  if (!spanContext) return {};
  
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
  };
}

/**
 * Pino logger with trace enrichment
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (config.nodeEnv === 'production' ? 'info' : 'debug'),
  base: {
    service: 'worker',
    env: config.nodeEnv,
  },
  messageKey: 'msg',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (obj) => {
      // Enrich with trace context
      return {
        ...obj,
        ...getTraceContext(),
      };
    },
  },
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

