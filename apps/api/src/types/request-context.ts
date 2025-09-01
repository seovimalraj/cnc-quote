import { Request } from "express";
import { Logger } from "@nestjs/common";

export interface RequestWithContext extends Request {
  requestId: string;
  logger: Logger;
  user?: {
    id: string;
    orgId: string;
    email: string;
    roles: string[];
  };
}
