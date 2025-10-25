import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { ErrorResponse } from "./error.types";

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalErrorFilter.name);

  catch(error: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get request ID from request context
  const requestId = (request as any).requestId || "unknown";
  const requestLogger = (request as any).logger || this.logger;

    // Determine status code and error details
    interface ErrorResponse {
      message: string;
      code?: string;
      details?: unknown;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse = { message: "Internal server error" };

    // Handle RLS violations from Supabase
    if (error.message?.includes("JWT role claim")) {
      status = HttpStatus.FORBIDDEN;
      errorResponse = {
        code: "RLS_DENIED",
        message: "Access denied by row level security policy",
      };
    }
    // Handle HTTP exceptions
    else if (error instanceof HttpException) {
      status = error.getStatus();
      const response = error.getResponse();
      errorResponse = typeof response === "string" ? { message: response } : (response as ErrorResponse);
    }

    // Convert error response to standard format
    const normalizedError = {
      code: this.normalizeErrorCode(status, error.name),
      message: this.getErrorMessage(errorResponse),
      request_id: requestId,
      ...(process.env.NODE_ENV !== "production" && {
        stack: error.stack,
        details: errorResponse,
      }),
    };

    // Log the error
    try {
      // Prefer structured logging when available
      (requestLogger as any).error?.(
        {
          error: normalizedError,
          status,
          url: request.url,
          method: request.method,
          body: request.body,
          params: request.params,
          query: request.query,
        },
        'Request error',
      );
    } catch {
      this.logger.error(`Request error ${status} ${request.method} ${request.url}`, error.stack);
    }

    // Send normalized response
    response.status(status).json(normalizedError);
  }

  private normalizeErrorCode(status: number, errorName: string): string {
    // Convert error name to lowercase snake_case code
    const baseCode = errorName
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");

    switch (status) {
      case HttpStatus.NOT_FOUND:
        return "not_found";
      case HttpStatus.UNAUTHORIZED:
        return "unauthorized";
      case HttpStatus.FORBIDDEN:
        return "forbidden";
      case HttpStatus.BAD_REQUEST:
        return "bad_request";
      case HttpStatus.CONFLICT:
        return "conflict";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "validation_error";
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return "internal_error";
      default:
        return baseCode;
    }
  }

  private getErrorMessage(errorResponse: ErrorResponse): string {
    if (typeof errorResponse === "string") {
      return errorResponse;
    }
    if (errorResponse instanceof Error || errorResponse instanceof HttpException) {
      return errorResponse.message;
    }
    if (typeof errorResponse === "object" && errorResponse !== null) {
      return errorResponse.message || errorResponse.error || "An error occurred";
    }
    return "An error occurred";
  }
}
