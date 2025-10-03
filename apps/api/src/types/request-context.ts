import { Request } from "express";
import { Logger } from "@nestjs/common";
import { LoggerService } from "../observability/logger.types";
import { RequestUser } from "../auth/jwt.strategy";
import { Membership, Role } from "../auth/rbac.types";

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
