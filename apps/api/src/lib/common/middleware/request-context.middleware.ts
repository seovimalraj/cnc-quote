/**
 * Step 19: Request Context Middleware
 * AsyncLocalStorage for trace/request ID propagation
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { randomUUID } from 'crypto';

/**
 * Request context interface
 */
export interface RequestContext {
  traceId: string;
  spanId?: string;
  requestId: string;
  orgId: string | null;
  userId: string | null;
  route?: string;
  method?: string;
}

/**
 * AsyncLocalStorage for request context
 */
export const als = new AsyncLocalStorage<RequestContext>();

/**
 * Middleware to initialize request context
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract or generate trace ID
    const incomingTraceId = req.headers['x-trace-id'] as string | undefined;
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    
    // Get active span from OpenTelemetry
    const span = trace.getSpan(context.active());
    const spanContext = span?.spanContext();
    
    const traceId = incomingTraceId || 
                   (spanContext?.traceId ? this.formatTraceId(spanContext.traceId) : undefined) || 
                   this.generateTraceId();
    
    const spanId = spanContext?.spanId ? this.formatSpanId(spanContext.spanId) : undefined;
    
    // Extract context from headers or auth
    const orgId = req.headers['x-org-id'] as string || (req as any).user?.orgId || null;
    const userId = (req as any).user?.id || null;
    const route = req.route?.path || req.path;
    const method = req.method;
    
    // Create request context
    const ctx: RequestContext = {
      traceId,
      spanId,
      requestId,
      orgId,
      userId,
      route,
      method,
    };
    
    // Run in AsyncLocalStorage context
    als.run(ctx, () => {
      // Set response headers
      res.setHeader('x-trace-id', traceId);
      res.setHeader('x-request-id', requestId);
      
      // Add span attributes if available
      if (span) {
        span.setAttribute('http.request_id', requestId);
        if (orgId) span.setAttribute('org.id', orgId);
        if (userId) span.setAttribute('user.id', userId);
        span.setAttribute('http.route', route);
      }
      
      // Track response
      res.on('finish', () => {
        if (span && res.statusCode >= 400) {
          span.setStatus({
            code: res.statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
            message: res.statusMessage,
          });
        }
      });
      
      next();
    });
  }
  
  /**
   * Format trace ID to hex string (32 chars)
   */
  private formatTraceId(traceId: string): string {
    if (traceId.length === 32) return traceId;
    // If it's a number, convert to hex
    return traceId.padStart(32, '0');
  }
  
  /**
   * Format span ID to hex string (16 chars)
   */
  private formatSpanId(spanId: string): string {
    if (spanId.length === 16) return spanId;
    return spanId.padStart(16, '0');
  }
  
  /**
   * Generate new trace ID (32 hex chars)
   */
  private generateTraceId(): string {
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').substring(0, 8);
  }
}

/**
 * Get current request context
 */
export function getReqCtx(): RequestContext {
  return als.getStore() || {
    traceId: 'unknown',
    requestId: 'unknown',
    orgId: null,
    userId: null,
  };
}

/**
 * Get trace ID from current context
 */
export function getTraceId(): string {
  return getReqCtx().traceId;
}

/**
 * Get request ID from current context
 */
export function getRequestId(): string {
  return getReqCtx().requestId;
}
