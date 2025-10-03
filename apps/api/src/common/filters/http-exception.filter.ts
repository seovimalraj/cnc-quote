/**
 * Step 20: HTTP Exception Filter
 * Standardize error responses with requestId and traceId
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getTraceId, getRequestId } from '../middleware/request-context.middleware';

interface ErrorResponse {
  error: string;
  code: string;
  requestId: string;
  traceId?: string;
  details?: any;
  timestamp?: string;
  path?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorCode = this.getErrorCode(status);
    const message = this.getErrorMessage(exception);
    const details = this.getErrorDetails(exception);

    // Get trace context
    const traceId = getTraceId();
    const requestId = getRequestId() || (request as any).id || 'unknown';

    const errorResponse: ErrorResponse = {
      error: message,
      code: errorCode,
      requestId,
      ...(traceId && { traceId }),
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error with context
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status} ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      406: 'NOT_ACCEPTABLE',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return codeMap[status] || 'INTERNAL';
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null) {
        return (response as any).message || exception.message;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private getErrorDetails(exception: unknown): any {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const { message, ...rest } = response as any;
        if (Object.keys(rest).length > 0) {
          return rest;
        }
      }
    }

    return undefined;
  }
}
