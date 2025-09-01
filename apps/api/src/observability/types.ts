export interface LogContext {
  [key: string]: unknown;
}

export interface RequestLogContext extends LogContext {
  requestId?: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
}
