import { SetMetadata } from '@nestjs/common';

/**
 * Policy requirement for RBAC authorization
 */
export interface PolicyRequirement {
  action: string; // 'create', 'view', 'update', 'delete', 'approve', 'override', '*'
  resource: string; // 'quotes', 'orders', 'users', 'materials', 'payments', '*'
}

/**
 * Metadata key for policy requirements
 */
export const POLICIES_KEY = 'policies';

/**
 * Decorator to attach policy requirements to route handlers
 * 
 * @example
 * ```typescript
 * @Policies({ action: 'create', resource: 'quotes' })
 * async createQuote() { ... }
 * 
 * @Policies(
 *   { action: 'view', resource: 'quotes' },
 *   { action: 'view', resource: 'pricing' }
 * )
 * async getQuoteWithPricing() { ... }
 * ```
 */
export const Policies = (...policies: PolicyRequirement[]) =>
  SetMetadata(POLICIES_KEY, policies);
