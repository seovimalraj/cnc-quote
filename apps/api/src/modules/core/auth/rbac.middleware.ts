import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  mixin,
  Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PolicyEngine } from './policy.engine';
import { RbacContext } from './rbac.types';

const FEATURE_FLAG_KEY = 'RBAC_V1';
const ORG_HEADER = 'x-org-id';

export const RbacGuard = (action: string, resource: string): Type<CanActivate> => {
  @Injectable()
  class RbacGuardMixin implements CanActivate {
    private readonly logger = new Logger(`RbacGuard:${action}:${resource}`);

    constructor(
      private readonly policyEngine: PolicyEngine,
      private readonly configService: ConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const started = Date.now();
      try {
        if (!this.isFeatureEnabled()) {
          return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request?.user;
        if (!user?.sub) {
          throw new ForbiddenException('Missing authenticated user context');
        }

        const orgId = this.resolveOrgId(request);
        if (!orgId) {
          throw new ForbiddenException('Missing organization context');
        }

        const membership = await this.policyEngine.getMembership(orgId, user.sub);
        if (!membership) {
          throw new ForbiddenException('User not a member of organization');
        }

        const rbacCtx: RbacContext = {
          userId: user.sub,
          orgId,
          role: membership.role,
          membership,
          traceId: request.headers?.['x-trace-id'] ?? request.id ?? null,
        };

        const evaluation = await this.policyEngine.can(rbacCtx, action, resource, {
          org_id: orgId,
          user_id: user.sub,
          method: request.method,
          path: request.url,
        });

        if (!evaluation.allowed) {
          this.logger.warn(
            `policy.deny user=${user.sub} org=${orgId} action=${action} resource=${resource}`,
          );
          throw new ForbiddenException('RBAC policy denied the operation');
        }

        // Attach resolved RBAC context to request for downstream consumers
        request.rbac = {
          orgId,
          role: membership.role,
          membership,
        };
        request.org = { id: orgId };
        request.audit = request.audit ?? null;
        request.setAudit = (preset: any) => {
          request.audit = preset;
        };

        return true;
      } finally {
        const elapsed = Date.now() - started;
        // eslint-disable-next-line no-console
        if (elapsed > 10) {
          this.logger.debug(`RBAC evaluation latency ${elapsed}ms for action=${action}`);
        }
      }
    }

    private isFeatureEnabled(): boolean {
      const flag = this.configService.get<string | boolean>(FEATURE_FLAG_KEY);
      if (flag === undefined || flag === null) return false;
      if (typeof flag === 'boolean') return flag;
      return flag.toString().toLowerCase() === 'true';
    }

    private resolveOrgId(request: any): string | undefined {
      const headerOrg = (request.headers?.[ORG_HEADER] || request.headers?.['X-Org-Id']) as
        | string
        | undefined;
      if (headerOrg) {
        return headerOrg;
      }
      const user = request.user;
      return user?.last_org_id || user?.default_org_id;
    }
  }

  return mixin(RbacGuardMixin);
};
