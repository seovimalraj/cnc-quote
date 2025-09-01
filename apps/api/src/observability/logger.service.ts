import { Injectable, LoggerService } from "@nestjs/common";
import pino from "pino";

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

  private formatMessage(message: any, context?: string, ...args: any[]) {
    return {
      msg: message,
      ...(context && { context }),
      ...(args?.length && { args }),
    };
  }

  log(message: any, context?: string, ...args: any[]) {
    this.logger.info(this.formatMessage(message, context, ...args));
  }

  error(message: any, trace?: string, context?: string, ...args: any[]) {
    this.logger.error({
      ...this.formatMessage(message, context, ...args),
      ...(trace && { trace }),
    });
  }

  warn(message: any, context?: string, ...args: any[]) {
    this.logger.warn(this.formatMessage(message, context, ...args));
  }

  debug(message: any, context?: string, ...args: any[]) {
    this.logger.debug(this.formatMessage(message, context, ...args));
  }

  verbose(message: any, context?: string, ...args: any[]) {
    this.logger.trace(this.formatMessage(message, context, ...args));
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
