import { RequestUser } from "../auth/jwt.strategy";
import { Membership } from "../auth/rbac.types";
import { Role } from "@cnc-quote/shared";
import { AuditAction, AuditResourceType } from "../audit/audit.types";
import { LoggerService } from "../observability/logger.types";

interface RequestAuditPreset {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
}

export {};

interface RequestOrgContext {
  id: string;
}

interface RequestRbacContext {
  orgId: string;
  role: Role;
  membership: Membership;
}

declare global {
  namespace Express {
    interface User extends RequestUser {}

    interface Request {
      user?: RequestUser;
      audit?: RequestAuditPreset | null;
      setAudit?: (preset: RequestAuditPreset | null) => void;
      org?: RequestOrgContext | null;
      rbac?: RequestRbacContext;
      logger?: LoggerService;
      requestId?: string;
      traceId?: string;
      id?: string;
    }
  }
}
