import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export class Logger {
  static info(msg: string, context?: Record<string, any>) {
    logger.info(context, msg);
  }

  static error(msg: string, error?: Error, context?: Record<string, any>) {
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

  static warn(msg: string, context?: Record<string, any>) {
    logger.warn(context, msg);
  }

  static debug(msg: string, context?: Record<string, any>) {
    logger.debug(context, msg);
  }

  static child(bindings: Record<string, any>) {
    return logger.child(bindings);
  }
}

export const getRequestLogger = (req: any) => {
  return Logger.child({
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};
