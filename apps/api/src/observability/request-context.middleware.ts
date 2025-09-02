import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

interface RequestContext {
  userId?: string;
  orgId?: string;
  requestId: string;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: () => void) {
    const user = req.user as { id?: string; orgId?: string } | undefined;
    const context: RequestContext = {
      userId: user?.id,
      orgId: user?.orgId,
      requestId: uuidv4(),
    };
    (req as any).context = context;
    next();
  }
}
