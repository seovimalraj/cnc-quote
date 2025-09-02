import { Injectable } from "@nestjs/common";
import pino from "pino";
import { LoggerParams, LoggerService } from "./logger.types";

@Injectable()
export class ApiLogger implements LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || "info",
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
      messageKey: "msg",
      base: undefined, // Remove pid and hostname
    });
  }

  private formatMessage(params: LoggerParams) {
    return {
      msg: params.message,
      ...(params.context && { context: params.context }),
      ...(params.error && { error: params.error }),
      ...(params.metadata && params.metadata),
    };
  }

  log(params: LoggerParams): void {
    this.logger.info(this.formatMessage(params));
  }

  error(params: LoggerParams): void {
    this.logger.error(this.formatMessage(params));
  }

  warn(params: LoggerParams): void {
    this.logger.warn(this.formatMessage(params));
  }

  debug(params: LoggerParams): void {
    this.logger.debug(this.formatMessage(params));
  }

  verbose(params: LoggerParams): void {
    this.logger.trace(this.formatMessage(params));
  }

  // Helper method to attach request context
  withRequest(requestId: string, userId?: string, orgId?: string) {
    return this.logger.child({
      request_id: requestId,
      ...(userId && { user_id: userId }),
      ...(orgId && { org_id: orgId }),
    });
  }
}
