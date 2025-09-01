export interface LoggerParams {
  context?: string;
  message: string;
  error?: Error | unknown;
  metadata?: Record<string, unknown>;
}

export interface LoggerService {
  log(params: LoggerParams): void;
  error(params: LoggerParams): void;
  warn(params: LoggerParams): void;
  debug(params: LoggerParams): void;
  verbose(params: LoggerParams): void;
}
