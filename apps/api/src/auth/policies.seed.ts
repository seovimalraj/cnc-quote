import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase/supabase.service';

interface SeedPolicy {
  name: string;
  effect: 'allow' | 'deny';
  action: string;
  resource: string;
  condition_json?: Record<string, unknown>;
}

interface RolePolicyMatrix {
  role: string;
  allow: SeedPolicy[];
  deny: SeedPolicy[];
}

const POLICY_MATRIX: RolePolicyMatrix[] = [
  {
    role: 'admin',
    allow: [
      { effect: 'allow', name: 'org:read', action: 'org:read', resource: 'org' },
      { effect: 'allow', name: 'org:create', action: 'org:create', resource: 'org' },
      { effect: 'allow', name: 'org:invite', action: 'org:invite', resource: 'org' },
      { effect: 'allow', name: 'org:member:update', action: 'org:member:update', resource: 'org' },
      { effect: 'allow', name: 'policy:read', action: 'policy:read', resource: 'policy' },
      { effect: 'allow', name: 'quotes:*', action: 'quotes:*', resource: 'quote' },
      { effect: 'allow', name: 'files:*', action: 'files:*', resource: 'file' },
      { effect: 'allow', name: 'pricing:*', action: 'pricing:*', resource: 'pricing' },
      { effect: 'allow', name: 'audit:read', action: 'audit:read', resource: 'audit' },
      { effect: 'allow', name: 'org:switch', action: 'org:switch', resource: 'org' },
    ],
    deny: [],
  },
  {
    role: 'engineer',
    allow: [
      { effect: 'allow', name: 'quotes:create', action: 'quotes:create', resource: 'quote' },
      { effect: 'allow', name: 'quotes:read', action: 'quotes:read', resource: 'quote' },
      { effect: 'allow', name: 'quotes:update', action: 'quotes:update', resource: 'quote' },
      { effect: 'allow', name: 'files:create', action: 'files:create', resource: 'file' },
      { effect: 'allow', name: 'files:read', action: 'files:read', resource: 'file' },
      { effect: 'allow', name: 'pricing:run', action: 'pricing:run', resource: 'pricing' },
      { effect: 'allow', name: 'org:switch', action: 'org:switch', resource: 'org' },
    ],
    deny: [
      { effect: 'deny', name: 'org:invite:deny', action: 'org:invite', resource: 'org' },
      { effect: 'deny', name: 'member:update:deny', action: 'org:member:update', resource: 'org' },
      { effect: 'deny', name: 'policy:write:deny', action: 'policy:write', resource: 'policy' },
      { effect: 'deny', name: 'audit:read:deny', action: 'audit:read', resource: 'audit' },
    ],
  },
  {
    role: 'buyer',
    allow: [
      { effect: 'allow', name: 'quotes:create', action: 'quotes:create', resource: 'quote' },
      { effect: 'allow', name: 'quotes:read', action: 'quotes:read', resource: 'quote' },
      { effect: 'allow', name: 'quotes:update', action: 'quotes:update', resource: 'quote' },
      { effect: 'allow', name: 'files:read', action: 'files:read', resource: 'file' },
      { effect: 'allow', name: 'org:switch', action: 'org:switch', resource: 'org' },
    ],
    deny: [
      { effect: 'deny', name: 'policy:deny', action: 'policy:*', resource: 'policy' },
      { effect: 'deny', name: 'audit:deny', action: 'audit:*', resource: 'audit' },
      { effect: 'deny', name: 'member:update:deny', action: 'org:member:update', resource: 'org' },
    ],
  },
  {
    role: 'viewer',
    allow: [
      { effect: 'allow', name: 'quotes:read', action: 'quotes:read', resource: 'quote' },
      { effect: 'allow', name: 'files:read', action: 'files:read', resource: 'file' },
      { effect: 'allow', name: 'org:switch', action: 'org:switch', resource: 'org' },
    ],
    deny: [
      { effect: 'deny', name: 'quotes:create:deny', action: 'quotes:create', resource: 'quote' },
      { effect: 'deny', name: 'quotes:update:deny', action: 'quotes:update', resource: 'quote' },
      { effect: 'deny', name: 'policy:deny', action: 'policy:*', resource: 'policy' },
      { effect: 'deny', name: 'audit:deny', action: 'audit:*', resource: 'audit' },
    ],
  },
  {
    role: 'security_analyst',
    allow: [
      { effect: 'allow', name: 'audit:read', action: 'audit:read', resource: 'audit' },
      { effect: 'allow', name: 'org:read:analyst', action: 'org:read', resource: 'org' },
    ],
    deny: [
      { effect: 'deny', name: 'quotes:modify:deny', action: 'quotes:*', resource: 'quote' },
      { effect: 'deny', name: 'files:modify:deny', action: 'files:*', resource: 'file' },
    ],
  },
];

@Injectable()
export class PolicySeeder implements OnModuleInit {
  private readonly logger = new Logger(PolicySeeder.name);

  constructor(private readonly supabase: SupabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.syncPolicyMatrix();
  }

  private async syncPolicyMatrix(): Promise<void> {
    for (const entry of POLICY_MATRIX) {
      const role = await this.ensureRole(entry.role);
      const policies = [...entry.allow, ...entry.deny];

      for (const policy of policies) {
        const policyId = await this.ensurePolicy(policy);
        await this.linkRolePolicy(role.id, policyId);
      }
    }
  }

  private async ensureRole(name: string): Promise<{ id: string }> {
    const { data, error } = await this.supabase.client
      .from('roles')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) return data;

    const { data: inserted, error: insertError } = await this.supabase.client
      .from('roles')
      .insert({ name, description: `${name} role` })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    this.logger.log(`Created role ${name}`);
    return inserted;
  }

  private async ensurePolicy(policy: SeedPolicy): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('policies')
      .select('id')
      .eq('name', policy.name)
      .eq('action', policy.action)
      .eq('resource', policy.resource)
      .maybeSingle();

    if (error) throw error;
    if (data) return data.id;

    const { data: inserted, error: insertError } = await this.supabase.client
      .from('policies')
      .insert({
        name: policy.name,
        effect: policy.effect,
        action: policy.action,
        resource: policy.resource,
        condition_json: policy.condition_json || {},
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    this.logger.log(`Created policy ${policy.name}`);
    return inserted.id;
  }

  private async linkRolePolicy(roleId: string, policyId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('role_policies')
      .select('role_id')
      .eq('role_id', roleId)
      .eq('policy_id', policyId)
      .maybeSingle();

    if (error) throw error;
    if (data) return;

    const { error: insertError } = await this.supabase.client
      .from('role_policies')
      .insert({ role_id: roleId, policy_id: policyId });

    if (insertError) throw insertError;
  }
}
