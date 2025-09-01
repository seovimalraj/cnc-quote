import { Injectable, NestMiddleware, Inject } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ExpressAdapter as _ExpressAdapter } from "@bull-board/express";
import { BoardConfig } from "./queue-monitor.board";

@Injectable()
export class QueueMonitorMiddleware implements NestMiddleware {
  constructor(@Inject("BULL_BOARD") private readonly bullBoard: BoardConfig) {}

  use(req: Request, res: Response, next: NextFunction) {
    // If the request is for the queue monitor UI, handle it
    if (req.baseUrl?.startsWith("/admin/queues")) {
      // Pass the request to the bull board middleware
      return this.bullBoard.serverAdapter.getRouter()(req, res, next);
    }
    next();
  }
}
