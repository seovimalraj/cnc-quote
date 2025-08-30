import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiLogger } from './logger.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly logger: ApiLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Get user and org context from JWT if available
    const user = (req as any).user;
    const userId = user?.sub;
    const orgId = user?.org_id;

    // Attach request ID to response headers
    res.setHeader('x-request-id', requestId);

    // Create request-scoped logger
    const requestLogger = this.logger.withRequest(requestId, userId, orgId);
    
    // Log the incoming request
    requestLogger.info({
      msg: 'Incoming request',
      method: req.method,
      url: req.url,
      headers: {
        ...req.headers,
        authorization: undefined // Don't log auth tokens
      }
    });

    // Add logger and request ID to request object for use in handlers
    (req as any).logger = requestLogger;
    (req as any).requestId = requestId;

    // Log response on finish
    res.on('finish', () => {
      requestLogger.info({
        msg: 'Request completed',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: Date.now() - req[Symbol.for('request-received')],
      });
    });

    next();
  }
}
