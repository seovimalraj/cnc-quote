import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from "../../../modules/legacy/audit-legacy/audit.service";
import { AuditAction, AuditResourceType } from "../../../modules/legacy/audit-legacy/audit.types";

type AuditPreset = {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: any = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap((responseBody) => {
        const preset: AuditPreset | undefined = req.audit;
        if (!preset?.action || !preset.resourceType || !req?.org?.id) {
          return;
        }

        const ctx = {
          orgId: req.org.id,
          userId: req.user?.sub ?? null,
          requestId: req.id ?? null,
          traceId: req.traceId ?? req.headers?.['x-trace-id'] ?? null,
          ip: req.ip ?? null,
          ua: req.headers?.['user-agent'] ?? null,
          path: req.path ?? null,
          method: req.method ?? null,
        };

        const payload = {
          action: preset.action,
          resourceType: preset.resourceType,
          resourceId: preset.resourceId ?? null,
          before: preset.before,
          after: preset.after ?? responseBody,
          ctx,
        };

        void this.audit.log(payload);
        req.audit = null;
      }),
    );
  }
}
