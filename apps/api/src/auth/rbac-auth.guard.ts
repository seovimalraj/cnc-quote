import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RbacAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}