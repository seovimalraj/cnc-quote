import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase/supabase.service';
import {
  DEFAULT_MEMBERSHIP_TTL_MS,
  DEFAULT_POLICY_TTL_MS,
  MembershipCacheEntry,
  Membership,
  Policy,
  PolicyCacheEntry,
  PolicyEvaluationResult,
  RbacAction,
  RbacContext,
  RbacResource,
} from './rbac.types';

interface ConditionContext {
  [key: string]: unknown;
}

@Injectable()
export class PolicyEngine {
  private readonly logger = new Logger(PolicyEngine.name);
  private policyCache = new Map<string, PolicyCacheEntry>();
  private membershipCache = new Map<string, MembershipCacheEntry>();

  constructor(private readonly supabase: SupabaseService) {}

  async can(
    ctx: RbacContext,
    action: RbacAction,
    resource: RbacResource,
    attributes: ConditionContext = {},
  ): Promise<PolicyEvaluationResult> {
    const policies = await this.loadPolicies(ctx.role);
    const applicable = policies.filter((policy) =>
      this.matches(policy, action, resource, { ...attributes, ...ctx.requestAttributes }),
    );

    const denied = applicable.filter((policy) => policy.effect === 'deny');
    if (denied.length > 0) {
      return { allowed: false, matchedPolicies: applicable, deniedPolicies: denied };
    }

    const allowed = applicable.some((policy) => policy.effect === 'allow');
    return { allowed, matchedPolicies: applicable, deniedPolicies: denied };
  }

  async getMembership(orgId: string, userId: string): Promise<Membership | null> {
    const cacheKey = `${userId}`;
    const cached = this.membershipCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      if (cached.orgIds.includes(orgId)) {
        // Lightweight re-query to fetch role for org
        return this.loadMembership(orgId, userId);
      }
      return null;
    }

    // Refresh cache for user
    const { data, error } = await this.supabase.client
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to load memberships for ${userId}: ${error.message}`);
      return this.loadMembership(orgId, userId);
    }

    const orgIds = (data || []).map((row) => row.org_id as string);
    this.membershipCache.set(cacheKey, {
      userId,
      orgIds,
      expiresAt: now + DEFAULT_MEMBERSHIP_TTL_MS,
    });

    if (!orgIds.includes(orgId)) {
      return null;
    }

    return this.loadMembership(orgId, userId);
  }

  async clearCaches(): Promise<void> {
    this.policyCache.clear();
    this.membershipCache.clear();
  }

  private async loadMembership(orgId: string, userId: string): Promise<Membership | null> {
    const { data, error } = await this.supabase.client
      .from('org_members')
      .select('org_id, user_id, role, joined_at')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Membership lookup failed for org=${orgId} user=${userId}: ${error.message}`);
      return null;
    }

    if (!data) return null;

    return {
      org_id: data.org_id,
      user_id: data.user_id,
      role: data.role,
      joined_at: data.joined_at,
    };
  }

  private async loadPolicies(roleName: string): Promise<Policy[]> {
    const now = Date.now();
    const cached = this.policyCache.get(roleName);
    if (cached && cached.expiresAt > now) {
      return cached.policies;
    }

    const { data, error } = await this.supabase.client
      .from('roles')
      .select('id, role_policies:role_policies(policy:policies(id,name,effect,action,resource,condition_json))')
      .eq('name', roleName)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to load policies for role=${roleName}: ${error.message}`);
      return [];
    }

    const policies = (data?.role_policies || [])
      .map((rp: any) => rp.policy)
      .filter(Boolean) as Policy[];

    this.policyCache.set(roleName, {
      role: roleName,
      policies,
      expiresAt: now + DEFAULT_POLICY_TTL_MS,
    });

    return policies;
  }

  private matches(
    policy: Policy,
    action: RbacAction,
    resource: RbacResource,
    attributes: ConditionContext,
  ): boolean {
    if (!this.patternMatch(policy.action, action)) return false;
    if (!this.patternMatch(policy.resource, resource)) return false;
    if (!policy.condition_json || Object.keys(policy.condition_json).length === 0) return true;
    try {
      return this.evaluateCondition(policy.condition_json, attributes);
    } catch (err) {
      this.logger.warn(`Condition evaluation failed for policy=${policy.id}: ${err}`);
      return false;
    }
  }

  private patternMatch(pattern: string, value: string): boolean {
    if (pattern === value) return true;
    if (pattern === '*') return true;
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return value.startsWith(prefix);
    }
    return false;
  }

  private evaluateCondition(condition: Record<string, unknown>, attributes: ConditionContext): boolean {
    if (!condition || Object.keys(condition).length === 0) return true;

    if (condition['equals'] && typeof condition['equals'] === 'object') {
      const equals = condition['equals'] as Record<string, unknown>;
      for (const [key, expected] of Object.entries(equals)) {
        if (attributes[key] !== expected) {
          return false;
        }
      }
      return true;
    }

    if (condition['oneOf'] && typeof condition['oneOf'] === 'object') {
      const oneOf = condition['oneOf'] as Record<string, unknown[]>;
      return Object.entries(oneOf).every(([key, allowed]) =>
        Array.isArray(allowed) ? allowed.includes(attributes[key] as never) : false,
      );
    }

    // Default to strict evaluation failure for unknown constructs
    return false;
  }
}
