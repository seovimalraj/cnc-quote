/**
 * Step 20: Response Interceptor
 * Add requestId and traceId to all success responses
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getTraceId, getRequestId } from '../middleware/request-context.middleware';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // Skip wrapping if response is already wrapped or is a stream
        if (this.shouldSkipWrapping(data, request)) {
          return data;
        }

        // Get trace context
        const traceId = getTraceId();
        const requestId = getRequestId() || (request as any).id || 'unknown';

        // If data is null/undefined, return minimal wrapper
        if (data == null) {
          return {
            requestId,
            ...(traceId && { traceId }),
          };
        }

        // If data already has requestId/traceId, don't double-wrap
        if (typeof data === 'object' && ('requestId' in data || 'traceId' in data)) {
          return {
            ...data,
            requestId: data.requestId || requestId,
            ...(traceId && { traceId: data.traceId || traceId }),
          };
        }

        // Wrap primitive values
        if (typeof data !== 'object' || Array.isArray(data)) {
          return {
            data,
            requestId,
            ...(traceId && { traceId }),
          };
        }

        // Add requestId/traceId to object response
        return {
          ...data,
          requestId,
          ...(traceId && { traceId }),
        };
      }),
    );
  }

  private shouldSkipWrapping(data: any, request: any): boolean {
    // Skip for health checks
    if (request.url?.includes('/health')) {
      return true;
    }

    // Skip for OpenAPI/docs
    if (request.url?.includes('/openapi.json') || request.url?.includes('/docs')) {
      return true;
    }

    // Skip for file downloads/streams
    if (data instanceof Buffer || data?.pipe) {
      return true;
    }

    return false;
  }
}
