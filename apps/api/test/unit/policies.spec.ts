/**
 * Unit Tests for PoliciesGuard
 * 
 * Tests policy evaluation, caching, and admin wildcard logic
 */

import { PoliciesGuard } from '../../../src/auth/policies.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { SupabaseService } from '../../../src/supabase/supabase.service';
import { AuditService } from '../../../src/audit/audit.service';

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let supabase: jest.Mocked<SupabaseService>;
  let audit: jest.Mocked<AuditService>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    // Mock Supabase service
    supabase = {
      client: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      },
    } as any;

    // Mock Audit service
    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock Reflector
    reflector = {
      get: jest.fn(),
    } as any;

    guard = new PoliciesGuard(reflector, supabase, audit);
  });

  afterEach(() => {
    jest.clearAllMocks();
    guard.clearCache(); // Clear policy cache between tests
  });

  // Helper to create mock execution context
  function createMockContext(user: any, policies: any[]): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          url: '/api/quotes',
          method: 'GET',
          ip: '127.0.0.1',
          headers: { 'user-agent': 'jest-test' },
        }),
      }),
    } as any;
  }

  describe('Policy Evaluation', () => {
    it('should allow buyer to create quotes', async () => {
      const user = { sub: 'user-1', role: 'buyer' };
      const policies = [{ action: 'create', resource: 'quotes' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-buyer' }, error: null }),
      } as any);

      // Mock policy check
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-1' }, error: null }),
      } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(audit.log).not.toHaveBeenCalled(); // No denied access log
    });

    it('should deny buyer from deleting quotes', async () => {
      const user = { sub: 'user-1', role: 'buyer' };
      const policies = [{ action: 'delete', resource: 'quotes' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-buyer' }, error: null }),
      } as any);

      // Mock policy check - no matching policy
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } }),
      } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCESS_DENIED',
          resourceType: 'policy',
        })
      );
    });

    it('should allow org_admin to delete quotes', async () => {
      const user = { sub: 'user-2', role: 'org_admin' };
      const policies = [{ action: 'delete', resource: 'quotes' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-org_admin' }, error: null }),
      } as any);

      // Mock policy check - org_admin has '*' action on quotes
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-org-admin-all-quotes' }, error: null }),
      } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Admin Wildcard', () => {
    it('should allow admin to do everything without DB query', async () => {
      const user = { sub: 'admin-1', role: 'admin' };
      const policies = [{ action: 'delete', resource: 'quotes' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Admin wildcard should not query the database
      expect(supabase.client.from).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('should allow admin with wildcard policy', async () => {
      const user = { sub: 'admin-1', role: 'admin' };
      const policies = [
        { action: 'create', resource: 'quotes' },
        { action: 'delete', resource: 'orders' },
        { action: 'override', resource: 'pricing' },
      ];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(supabase.client.from).not.toHaveBeenCalled();
    });
  });

  describe('Policy Caching', () => {
    it('should cache policy evaluation result', async () => {
      const user = { sub: 'user-1', role: 'buyer' };
      const policies = [{ action: 'view', resource: 'quotes' }];
      const context1 = createMockContext(user, policies);
      const context2 = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup (should be called twice - once per context)
      supabase.client.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-buyer' }, error: null }),
      } as any);

      // Mock policy check (should only be called once - second call uses cache)
      const policyMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-1' }, error: null }),
      };
      supabase.client.from.mockReturnValueOnce(policyMock as any);

      // First call - should hit DB
      const result1 = await guard.canActivate(context1);
      expect(result1).toBe(true);

      // Second call - should use cache
      const result2 = await guard.canActivate(context2);
      expect(result2).toBe(true);

      // Policy check should only be called once (cached on second call)
      expect(policyMock.select).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when clearCache() is called', async () => {
      const user = { sub: 'user-1', role: 'buyer' };
      const policies = [{ action: 'view', resource: 'quotes' }];
      const context1 = createMockContext(user, policies);
      const context2 = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup
      supabase.client.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-buyer' }, error: null }),
      } as any);

      // Mock policy check
      const policyMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-1' }, error: null }),
      };
      supabase.client.from.mockReturnValue(policyMock as any);

      // First call
      await guard.canActivate(context1);

      // Clear cache
      guard.clearCache();

      // Second call - should hit DB again
      await guard.canActivate(context2);

      // Policy check should be called twice (cache was cleared)
      expect(policyMock.select).toHaveBeenCalledTimes(2);
    });
  });

  describe('Wildcard Policies', () => {
    it('should match wildcard action policy', async () => {
      const user = { sub: 'user-1', role: 'org_admin' };
      const policies = [{ action: 'delete', resource: 'quotes' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-org_admin' }, error: null }),
      } as any);

      // Mock policy check - org_admin has '*' action on quotes
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-wildcard' }, error: null }),
      } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should match wildcard resource policy', async () => {
      const user = { sub: 'user-1', role: 'admin' };
      const policies = [{ action: 'view', resource: 'anything' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Admin should bypass DB check with wildcard
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(supabase.client.from).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should allow access if no policies are defined on endpoint', async () => {
      const user = { sub: 'user-1', role: 'buyer' };
      const context = createMockContext(user, []);

      reflector.get.mockReturnValue(undefined); // No @Policies decorator

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access if user has no role', async () => {
      const user = { sub: 'user-1' }; // No role property
      const policies = [{ action: 'view', resource: 'quotes' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(audit.log).toHaveBeenCalled();
    });

    it('should deny access if role lookup fails', async () => {
      const user = { sub: 'user-1', role: 'buyer' };
      const policies = [{ action: 'view', resource: 'quotes' }];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup failure
      supabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Role not found' } }),
      } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle multiple policy requirements (AND logic)', async () => {
      const user = { sub: 'user-1', role: 'reviewer' };
      const policies = [
        { action: 'view', resource: 'quotes' },
        { action: 'override', resource: 'dfm' },
      ];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup
      supabase.client.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-reviewer' }, error: null }),
      } as any);

      // Mock policy checks - both should succeed for reviewer
      supabase.client.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-1' }, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-2' }, error: null }),
        } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny if one of multiple policies fails', async () => {
      const user = { sub: 'user-1', role: 'buyer' };
      const policies = [
        { action: 'view', resource: 'quotes' },
        { action: 'override', resource: 'pricing' }, // Buyer should not have this
      ];
      const context = createMockContext(user, policies);

      reflector.get.mockReturnValue(policies);

      // Mock role_id lookup
      supabase.client.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'role-buyer' }, error: null }),
      } as any);

      // Mock policy checks - first succeeds, second fails
      supabase.client.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { policy_id: 'policy-1' }, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(audit.log).toHaveBeenCalled();
    });
  });
});
