import pino from "pino";
import { LogContext, RequestLogContext } from "./types";
import { Request } from "express";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

export class Logger {
  static info(msg: string, context?: LogContext) {
    logger.info(context, msg);
  }

  static error(msg: string, error?: Error, context?: LogContext) {
    logger.error(
      {
        err: {
          message: error?.message,
          stack: error?.stack,
          ...context,
        },
      },
      msg,
    );
  }

  static warn(msg: string, context?: LogContext) {
    logger.warn(context, msg);
  }

  static debug(msg: string, context?: LogContext) {
    logger.debug(context, msg);
  }

  static child(bindings: LogContext) {
    return logger.child(bindings);
  }
}

export const getRequestLogger = (req: Request) => {
  return Logger.child({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  } as RequestLogContext);
};
