import { Request } from "express";
import { Logger } from "@nestjs/common";
import { LoggerService } from "../observability/logger.types";
import { RequestUser } from "../modules/auth/jwt.strategy";
import { Membership } from "../modules/auth/rbac.types";
import type { Role } from "@cnc-quote/shared";

interface RequestOrgContext {
  id: string;
}

interface RequestRbacContext {
  orgId: string;
  role: Role;
  membership: Membership;
}

export interface RequestWithContext extends Request {
  requestId?: string;
  logger?: LoggerService | Logger;
  user?: RequestUser;
  org?: RequestOrgContext | null;
  rbac?: RequestRbacContext;
}
