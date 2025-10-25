import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '@cnc-quote/shared';

@Injectable()
export class RbacRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required
    }

    const request: Request = context.switchToHttp().getRequest();
    const membership = (request as any).membership;

    if (!membership) {
      throw new ForbiddenException('Organization context not loaded');
    }

    const userRole = membership.role as Role;
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}