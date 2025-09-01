import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";

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
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse = { message: "Internal server error" };

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
      errorResponse = error.getResponse();
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
    requestLogger.error({
      msg: "Request error",
      error: normalizedError,
      status,
      url: request.url,
      method: request.method,
      body: request.body,
      params: request.params,
      query: request.query,
    });

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

  private getErrorMessage(errorResponse: any): string {
    if (typeof errorResponse === "string") {
      return errorResponse;
    }
    if (typeof errorResponse === "object") {
      return errorResponse.message || errorResponse.error || "An error occurred";
    }
    return "An error occurred";
  }
}
