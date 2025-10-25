export type RbacEffect = 'allow' | 'deny';

export interface Policy {
  id: string;
  name: string;
  effect: RbacEffect;
  action: string;
  resource: string;
  condition_json?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  policies?: Policy[];
}

export interface Membership {
  org_id: string;
  user_id: string;
  role: string;
  joined_at?: string;
}

export interface RbacContext {
  userId: string;
  orgId: string;
  role: string;
  membership: Membership;
  traceId?: string;
  requestAttributes?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  matchedPolicies: Policy[];
  deniedPolicies: Policy[];
}

export interface PolicyCacheEntry {
  role: string;
  policies: Policy[];
  expiresAt: number;
}

export interface MembershipCacheEntry {
  userId: string;
  orgIds: string[];
  expiresAt: number;
}

export type RbacAction = string;
export type RbacResource = string;

export const DEFAULT_POLICY_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_MEMBERSHIP_TTL_MS = 60 * 1000; // 1 minute
