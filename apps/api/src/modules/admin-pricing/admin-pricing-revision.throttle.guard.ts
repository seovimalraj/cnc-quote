import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AdminPricingRevisionThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request & { user?: any }): Promise<string> {
    const orgId = req.user?.orgId ?? req.user?.organizationId ?? req.user?.organization_id;
    const userId = req.user?.userId ?? req.user?.id;

    if (orgId) {
      return `org:${orgId}`;
    }

    if (userId) {
      return `user:${userId}`;
    }

    return super.getTracker(req);
  }
}
