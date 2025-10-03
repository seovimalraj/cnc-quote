import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { POLICIES_KEY, PolicyRequirement } from './policies.decorator';
import { RequestUser } from './jwt.strategy';
import { SupabaseService } from '../lib/supabase/supabase.service';

/**
 * Guard to enforce policy-based access control
 * Evaluates @Policies decorator requirements against user's role permissions
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly logger = new Logger(PoliciesGuard.name);
  private readonly policyCache = new Map<string, boolean>();

  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPolicies = this.reflector.get<PolicyRequirement[]>(
      POLICIES_KEY,
      context.getHandler(),
    );

    // No policies required - allow access
    if (!requiredPolicies || requiredPolicies.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user || !user.role) {
      this.logger.warn('Access denied: User not authenticated');
      throw new ForbiddenException('Authentication required');
    }

    // Check each required policy
    for (const policy of requiredPolicies) {
      const allowed = await this.evaluatePolicy(user, policy);

      if (!allowed) {
        this.logger.warn(
          `Access denied: User ${user.sub} (role: ${user.role}) lacks permission: ${policy.action} on ${policy.resource}`,
        );

        // Log failed authorization attempt in audit log
        // Note: This is async but we don't await to avoid blocking the request
        this.logDeniedAccess(user, policy, request).catch((err) =>
          this.logger.error('Failed to log denied access', err),
        );

        throw new ForbiddenException(
          `Insufficient permissions: ${policy.action} on ${policy.resource}`,
        );
      }
    }

    return true;
  }

  /**
   * Evaluate if user has permission for the given policy
   */
  private async evaluatePolicy(
    user: RequestUser,
    policy: PolicyRequirement,
  ): Promise<boolean> {
    const cacheKey = `${user.role}:${policy.action}:${policy.resource}`;

    // Check cache first
    if (this.policyCache.has(cacheKey)) {
      return this.policyCache.get(cacheKey)!;
    }

    try {
      // Admin wildcard: admin role has access to everything
      if (user.role === 'admin') {
        this.policyCache.set(cacheKey, true);
        return true;
      }

      // Get role ID
      const roleId = await this.getRoleId(user.role);
      if (!roleId) {
        this.logger.warn(`Role not found: ${user.role}`);
        return false;
      }

      // Query role_policies to check if user's role has this policy
      const { data, error } = await this.supabase.client
        .from('role_policies')
        .select(
          `
          policy:policies!inner(
            action,
            resource,
            effect
          )
        `,
        )
        .eq('role_id', roleId);

      if (error) {
        this.logger.error('Failed to query role policies', error);
        return false;
      }

      if (!data || data.length === 0) {
        this.policyCache.set(cacheKey, false);
        return false;
      }

      // Check if any policy matches
      const hasPermission = data.some((row: any) => {
        const p = row.policy;
        if (!p || p.effect !== 'allow') return false;

        // Check for wildcard matches
        const actionMatch = p.action === '*' || p.action === policy.action;
        const resourceMatch = p.resource === '*' || p.resource === policy.resource;

        return actionMatch && resourceMatch;
      });

      this.policyCache.set(cacheKey, hasPermission);
      return hasPermission;
    } catch (error) {
      this.logger.error('Policy evaluation error', error);
      return false;
    }
  }

  /**
   * Get role ID from role name (with caching)
   */
  private async getRoleId(roleName: string): Promise<string | null> {
    const cacheKey = `role_id:${roleName}`;
    if (this.policyCache.has(cacheKey)) {
      return this.policyCache.get(cacheKey) as string;
    }

    const { data, error } = await this.supabase.client
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (error || !data) {
      return null;
    }

    this.policyCache.set(cacheKey, data.id);
    return data.id;
  }

  /**
   * Log denied access attempt to audit log
   */
  private async logDeniedAccess(
    user: RequestUser,
    policy: PolicyRequirement,
    request: any,
  ): Promise<void> {
    try {
      await this.supabase.client.rpc('log_audit_event', {
        p_org_id: user.org_id || null,
        p_user_id: user.sub,
        p_action: 'authorization.denied',
        p_resource_type: policy.resource,
        p_resource_id: null,
        p_before_json: null,
        p_after_json: {
          policy_action: policy.action,
          policy_resource: policy.resource,
          user_role: user.role,
        },
        p_ip_address: request.ip || null,
        p_user_agent: request.headers['user-agent'] || null,
        p_request_id: request.id || null,
        p_trace_id: null,
      });
    } catch (error) {
      // Swallow audit log errors - don't fail the request
      this.logger.error('Failed to log denied access', error);
    }
  }

  /**
   * Clear policy cache (useful for testing or when roles/policies change)
   */
  clearCache(): void {
    this.policyCache.clear();
  }
}
