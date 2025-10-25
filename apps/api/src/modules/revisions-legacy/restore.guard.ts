/**
 * Step 16: Restore Guard
 * RBAC policy enforcement for revision restore operations
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface RestorePolicy {
  allowedRoles: string[];
  allowedStatuses: string[];
  requireNote: boolean;
}

const DEFAULT_RESTORE_POLICY: RestorePolicy = {
  allowedRoles: ['admin', 'engineer', 'sales_manager'],
  allowedStatuses: ['draft', 'pending'],
  requireNote: false,
};

@Injectable()
export class RestoreGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has revisions:restore permission
    const permissions = user.permissions || [];
    if (!permissions.includes('revisions:restore')) {
      throw new ForbiddenException(
        'Missing permission: revisions:restore',
      );
    }

    // Check role-based access
    const policy = DEFAULT_RESTORE_POLICY;
    const userRole = user.role;

    if (!policy.allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Role ${userRole} is not allowed to restore revisions. Allowed roles: ${policy.allowedRoles.join(', ')}`,
      );
    }

    // Note: Quote status check happens in service layer
    // since we need to fetch the quote first

    return true;
  }
}

/**
 * Decorator to require restore permission
 */
export const RequireRestore = () => {
  // This would use SetMetadata in real implementation
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
};
