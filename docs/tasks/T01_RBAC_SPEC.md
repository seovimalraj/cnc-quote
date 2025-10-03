# T01-RBAC: End-to-End Role-Based Access Control

**Task ID:** T01-RBAC  
**Phase:** A - Core Parity & Compliance  
**Priority:** P0 (Blocker)  
**Size:** L (8-10 days)  
**Status:** 🟨 In Progress (40%)  
**Disciplines:** Security, Backend, Frontend  
**Dependencies:** None  
**Blocks:** T15-CHECKOUT-SUITE, T18-SUPPLIER-ONBOARD, T30-SSO-SCIM

---

## 📋 Objective

Implement production-grade RBAC with:
1. Multi-tenant organization isolation with Row Level Security (RLS)
2. Policy-based access control with `@Policies` decorator
3. Comprehensive audit logging for all privileged operations
4. Frontend role-based feature gating
5. Cross-org access prevention with tests

---

## 🏗️ Database Schema Changes

### Migration: `0023_rbac_audit.sql`

```sql
-- ============================================================================
-- RBAC & Audit Log Schema
-- Migration: 0023_rbac_audit.sql
-- ============================================================================

-- Organizations table (if not exists - may already be present)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members table (replaces organization_memberships if needed)
CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'org_admin', 'reviewer', 'finance', 'auditor')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Roles catalog table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('buyer', 'org_admin', 'reviewer', 'finance', 'auditor', 'admin', 'partner')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policies table
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  action TEXT NOT NULL, -- 'quotes:create', 'orders:cancel', etc.
  resource TEXT NOT NULL, -- 'quotes', 'orders', 'materials', etc.
  condition_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role-Policy mapping
CREATE TABLE role_policies (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, policy_id)
);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'user.role_changed', 'quote.approved', 'order.shipped', etc.
  resource_type TEXT NOT NULL, -- 'user', 'quote', 'order', etc.
  resource_id UUID,
  before_json JSONB,
  after_json JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Add org_id to existing tables (if not present)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE pricing_cache ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Enable RLS on all multi-tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own org's data
CREATE POLICY org_isolation_organizations ON organizations
  FOR ALL USING (
    id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY org_isolation_quotes ON quotes
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY org_isolation_orders ON orders
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY org_isolation_uploads ON uploads
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY org_isolation_pricing_cache ON pricing_cache
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Admin bypass policies (service role only)
CREATE POLICY admin_bypass_quotes ON quotes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY admin_bypass_orders ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Seed default roles
INSERT INTO roles (name, description) VALUES
  ('buyer', 'Can create quotes and place orders'),
  ('org_admin', 'Can manage organization, invite users, override pricing'),
  ('reviewer', 'Can review and approve quotes'),
  ('finance', 'Can manage payments and view financial data'),
  ('auditor', 'Read-only access to audit logs'),
  ('admin', 'Platform administrator with full access'),
  ('partner', 'Supplier partner with limited access')
ON CONFLICT (name) DO NOTHING;

-- Seed default policies (examples)
INSERT INTO policies (name, effect, action, resource) VALUES
  ('buyer_create_quote', 'allow', 'create', 'quotes'),
  ('buyer_view_quote', 'allow', 'view', 'quotes'),
  ('org_admin_invite_user', 'allow', 'invite', 'users'),
  ('org_admin_change_role', 'allow', 'change_role', 'users'),
  ('finance_view_payments', 'allow', 'view', 'payments'),
  ('auditor_view_audit', 'allow', 'view', 'audit_log')
ON CONFLICT (name) DO NOTHING;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_org_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_before_json JSONB DEFAULT NULL,
  p_after_json JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,
  p_trace_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    org_id, user_id, action, resource_type, resource_id,
    before_json, after_json, ip_address, user_agent, request_id, trace_id
  ) VALUES (
    p_org_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_before_json, p_after_json, p_ip_address, p_user_agent, p_request_id, p_trace_id
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-audit role changes
CREATE OR REPLACE FUNCTION audit_role_change() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role <> NEW.role THEN
    PERFORM log_audit_event(
      NEW.org_id,
      NEW.user_id,
      'user.role_changed',
      'user',
      NEW.user_id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_members_audit_trigger
  AFTER UPDATE ON org_members
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_change();

COMMENT ON TABLE audit_log IS 'Audit trail for all privileged operations';
COMMENT ON TABLE policies IS 'Fine-grained access control policies';
COMMENT ON TABLE role_policies IS 'Maps roles to their allowed policies';
```

### Rollback Script: `0023_rbac_audit_rollback.sql`

```sql
-- Rollback for 0023_rbac_audit.sql

DROP TRIGGER IF EXISTS org_members_audit_trigger ON org_members;
DROP FUNCTION IF EXISTS audit_role_change();
DROP FUNCTION IF EXISTS log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT, UUID, TEXT);

DROP POLICY IF EXISTS admin_bypass_orders ON orders;
DROP POLICY IF EXISTS admin_bypass_quotes ON quotes;
DROP POLICY IF EXISTS org_isolation_pricing_cache ON pricing_cache;
DROP POLICY IF EXISTS org_isolation_uploads ON uploads;
DROP POLICY IF EXISTS org_isolation_orders ON orders;
DROP POLICY IF EXISTS org_isolation_quotes ON quotes;
DROP POLICY IF EXISTS org_isolation_organizations ON organizations;

ALTER TABLE pricing_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_resource;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS idx_audit_log_org_id;

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS role_policies CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;

-- Note: Not dropping organizations table as it may be used elsewhere
-- ALTER TABLE quotes DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE uploads DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE pricing_cache DROP COLUMN IF EXISTS org_id;
```

---

## 🔧 Backend Implementation

### 1. Policy Decorator (`apps/api/src/auth/policies.decorator.ts`)

```typescript
import { SetMetadata } from '@nestjs/common';

export interface PolicyRequirement {
  action: string; // 'create', 'update', 'delete', 'view'
  resource: string; // 'quotes', 'orders', 'users'
}

export const POLICIES_KEY = 'policies';
export const Policies = (...policies: PolicyRequirement[]) =>
  SetMetadata(POLICIES_KEY, policies);

// Usage example:
// @Policies({ action: 'create', resource: 'quotes' })
```

### 2. Policy Guard (`apps/api/src/auth/policies.guard.ts`)

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { POLICIES_KEY, PolicyRequirement } from './policies.decorator';
import { RequestUser } from './jwt.strategy';
import { AuditService } from '../audit/audit.service';
import { SupabaseService } from '../lib/supabase/supabase.service';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPolicies = this.reflector.get<PolicyRequirement[]>(
      POLICIES_KEY,
      context.getHandler(),
    );

    if (!requiredPolicies || requiredPolicies.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check each required policy
    for (const policy of requiredPolicies) {
      const allowed = await this.evaluatePolicy(user, policy);
      
      if (!allowed) {
        // Log failed authorization attempt
        await this.auditService.log({
          org_id: user.org_id,
          user_id: user.sub,
          action: 'authorization.denied',
          resource_type: policy.resource,
          after_json: { policy: policy.action, role: user.role },
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          request_id: request.id,
        });

        throw new ForbiddenException(
          `Insufficient permissions: ${policy.action} on ${policy.resource}`,
        );
      }
    }

    return true;
  }

  private async evaluatePolicy(
    user: RequestUser,
    policy: PolicyRequirement,
  ): Promise<boolean> {
    // Query role_policies to check if user's role has this policy
    const { data, error } = await this.supabase.client
      .from('role_policies')
      .select(`
        policy:policies!inner(action, resource, effect)
      `)
      .eq('role_id', await this.getRoleId(user.role))
      .eq('policies.action', policy.action)
      .eq('policies.resource', policy.resource)
      .eq('policies.effect', 'allow')
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  private async getRoleId(roleName: string): Promise<string> {
    const { data } = await this.supabase.client
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    return data?.id;
  }
}
```

### 3. Audit Service (`apps/api/src/audit/audit.service.ts`)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase/supabase.service';

export interface AuditLogEntry {
  org_id?: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  before_json?: Record<string, any>;
  after_json?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  trace_id?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(entry: AuditLogEntry): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.client.rpc('log_audit_event', {
        p_org_id: entry.org_id || null,
        p_user_id: entry.user_id || null,
        p_action: entry.action,
        p_resource_type: entry.resource_type,
        p_resource_id: entry.resource_id || null,
        p_before_json: entry.before_json || null,
        p_after_json: entry.after_json || null,
        p_ip_address: entry.ip_address || null,
        p_user_agent: entry.user_agent || null,
        p_request_id: entry.request_id || null,
        p_trace_id: entry.trace_id || null,
      });

      if (error) {
        this.logger.error('Failed to write audit log', error);
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error('Audit log exception', error);
      return null;
    }
  }

  async query(filters: {
    org_id?: string;
    user_id?: string;
    action?: string;
    resource_type?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let query = this.supabase.client
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.org_id) query = query.eq('org_id', filters.org_id);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.resource_type) query = query.eq('resource_type', filters.resource_type);
    if (filters.start_date) query = query.gte('created_at', filters.start_date.toISOString());
    if (filters.end_date) query = query.lte('created_at', filters.end_date.toISOString());

    query = query.limit(filters.limit || 100);

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to query audit log', error);
      return [];
    }

    return data || [];
  }
}
```

### 4. Update Controllers with `@Policies`

**Example: `apps/api/src/modules/quotes/quotes.controller.ts`**

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { PoliciesGuard } from '../../auth/policies.guard';
import { Policies } from '../../auth/policies.decorator';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @Policies({ action: 'view', resource: 'quotes' })
  async findAll() {
    return this.quotesService.findAll();
  }

  @Post()
  @Policies({ action: 'create', resource: 'quotes' })
  async create(@Body() createQuoteDto: any) {
    return this.quotesService.create(createQuoteDto);
  }

  @Put(':id')
  @Policies({ action: 'update', resource: 'quotes' })
  async update(@Param('id') id: string, @Body() updateQuoteDto: any) {
    return this.quotesService.update(id, updateQuoteDto);
  }

  @Delete(':id')
  @Policies({ action: 'delete', resource: 'quotes' })
  async delete(@Param('id') id: string) {
    return this.quotesService.delete(id);
  }
}
```

---

## 🎨 Frontend Implementation

### 1. Feature Gating Hook (`apps/web/lib/rbac.ts`)

```typescript
import { useUser } from '@/hooks/useUser';

export function usePermissions() {
  const user = useUser();

  const can = (action: string, resource: string): boolean => {
    if (!user?.role) return false;

    // Hardcoded permissions (in production, fetch from API)
    const permissions: Record<string, Record<string, string[]>> = {
      buyer: {
        quotes: ['view', 'create'],
        dfm: ['view'],
        pricing: ['view'],
      },
      org_admin: {
        quotes: ['view', 'create', 'update', 'delete'],
        users: ['invite', 'change_role'],
        pricing: ['view', 'override'],
      },
      admin: {
        '*': ['*'], // Wildcard for all permissions
      },
    };

    const rolePerms = permissions[user.role];
    if (!rolePerms) return false;

    // Check wildcard
    if (rolePerms['*']?.includes('*')) return true;

    const resourcePerms = rolePerms[resource];
    if (!resourcePerms) return false;

    return resourcePerms.includes(action) || resourcePerms.includes('*');
  };

  return { can, role: user?.role };
}

// Usage example:
// const { can } = usePermissions();
// {can('delete', 'quotes') && <DeleteButton />}
```

### 2. Organization Switcher (`apps/web/app/(dash)/org-switcher.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';

export function OrgSwitcher() {
  const router = useRouter();
  const { currentOrg, organizations, switchOrg } = useOrganization();
  const [loading, setLoading] = useState(false);

  const handleSwitch = async (orgId: string) => {
    setLoading(true);
    await switchOrg(orgId);
    router.refresh();
    setLoading(false);
  };

  return (
    <Select value={currentOrg?.id} onValueChange={handleSwitch} disabled={loading}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 3. Settings Members Page (`apps/web/app/(dash)/settings/members/page.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/lib/rbac';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrgMember {
  user_id: string;
  email: string;
  name: string;
  role: string;
  invited_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const { can } = usePermissions();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const res = await fetch('/api/org/members');
    const data = await res.json();
    setMembers(data);
  };

  const changeRole = async (userId: string, newRole: string) => {
    await fetch(`/api/org/members/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    fetchMembers();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Members</h1>
        {can('invite', 'users') && (
          <Button>Invite Member</Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {can('change_role', 'users') && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.user_id}>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <Badge>{member.role}</Badge>
              </TableCell>
              <TableCell>{new Date(member.invited_at).toLocaleDateString()}</TableCell>
              {can('change_role', 'users') && (
                <TableCell>
                  <Select value={member.role} onValueChange={(role) => changeRole(member.user_id, role)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="org_admin">Org Admin</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests: Policy Evaluation

**File:** `apps/api/test/unit/policies.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { PoliciesGuard } from '../../src/auth/policies.guard';
import { SupabaseService } from '../../src/lib/supabase/supabase.service';
import { AuditService } from '../../src/audit/audit.service';
import { Reflector } from '@nestjs/core';

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PoliciesGuard,
        Reflector,
        { provide: SupabaseService, useValue: { client: { from: jest.fn() } } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    guard = module.get(PoliciesGuard);
    supabaseService = module.get(SupabaseService);
  });

  it('should allow buyer to create quotes', async () => {
    // Mock Supabase response
    jest.spyOn(supabaseService.client, 'from').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { policy: { effect: 'allow' } }, error: null }),
    } as any);

    const user = { sub: 'user-123', role: 'buyer', org_id: 'org-456' };
    const policy = { action: 'create', resource: 'quotes' };

    const result = await (guard as any).evaluatePolicy(user, policy);
    expect(result).toBe(true);
  });

  it('should deny buyer from deleting quotes', async () => {
    jest.spyOn(supabaseService.client, 'from').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    } as any);

    const user = { sub: 'user-123', role: 'buyer', org_id: 'org-456' };
    const policy = { action: 'delete', resource: 'quotes' };

    const result = await (guard as any).evaluatePolicy(user, policy);
    expect(result).toBe(false);
  });
});
```

### 2. E2E Tests: Cross-Org Access Prevention

**File:** `apps/api/test/e2e/rbac.e2e.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let org1Token: string;
  let org2Token: string;
  let org1QuoteId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create two orgs with users
    // (Assumes seed data or test fixtures)
    org1Token = 'jwt-for-org1-user';
    org2Token = 'jwt-for-org2-user';
  });

  it('should create quote in org1', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${org1Token}`)
      .send({ name: 'Test Quote', org_id: 'org1' })
      .expect(201);

    org1QuoteId = response.body.id;
  });

  it('should deny org2 user from viewing org1 quote', async () => {
    await request(app.getHttpServer())
      .get(`/quotes/${org1QuoteId}`)
      .set('Authorization', `Bearer ${org2Token}`)
      .expect(403);
  });

  it('should allow org1 user to view own quote', async () => {
    await request(app.getHttpServer())
      .get(`/quotes/${org1QuoteId}`)
      .set('Authorization', `Bearer ${org1Token}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 3. E2E Tests: Audit Row Appears on Role Change

**File:** `apps/api/test/e2e/audit.e2e.spec.ts`

```typescript
describe('Audit Log (e2e)', () => {
  it('should log role change in audit_log', async () => {
    // Change user role
    await request(app.getHttpServer())
      .put('/admin/users/user-123/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'org_admin' })
      .expect(200);

    // Query audit log
    const auditResponse = await request(app.getHttpServer())
      .get('/admin/audit-log?action=user.role_changed')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(auditResponse.body).toHaveLength(1);
    expect(auditResponse.body[0].action).toBe('user.role_changed');
    expect(auditResponse.body[0].before_json.role).toBe('buyer');
    expect(auditResponse.body[0].after_json.role).toBe('org_admin');
  });
});
```

---

## ✅ Acceptance Criteria

- [ ] **Buyer role can quote in-org; cannot change roles**
  - Verified via e2e test: buyer can POST /quotes, but cannot PUT /admin/users/:id/role
- [ ] **All privileged actions logged**
  - Role changes, quote approvals, order cancellations appear in audit_log
- [ ] **Cross-org access denied**
  - User from org2 cannot view org1 quotes (403 Forbidden)
- [ ] **Policy evaluation tests pass**
  - Unit tests for PoliciesGuard cover allow/deny scenarios

---

## 📚 Documentation Updates

1. **`docs/RBAC.md`**: Explain role structure, policy format, audit log schema
2. **`docs/API.md`**: Document `/admin/audit-log` endpoints
3. **`CHANGELOG.md`**: Add entry for T01-RBAC completion

---

## 🚀 Deployment Checklist

- [ ] Run migration `0023_rbac_audit.sql` in staging
- [ ] Seed roles and policies
- [ ] Update environment variables (none required)
- [ ] Run e2e test suite
- [ ] Deploy to production with rollback plan ready

---

## 📊 Estimated Effort Breakdown

| Task | Effort |
|------|--------|
| Database migration + RLS policies | 1 day |
| Policy decorator + guard implementation | 2 days |
| Audit service + logging | 1.5 days |
| Controller annotation (@Policies) | 1 day |
| Frontend RBAC hooks + UI | 1.5 days |
| Unit + E2E tests | 2 days |
| Documentation | 0.5 day |
| **Total** | **9.5 days** |

---

**Status:** Ready for implementation  
**Owner:** Backend/Security Team  
**Review:** Required from Security Lead before production deployment
