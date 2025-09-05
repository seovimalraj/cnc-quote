import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';

export interface RolePermission {
  role: string;
  resource: string;
  operation: string;
  allowed: boolean;
}

export interface UserRole {
  user_id: string;
  role: string;
  assigned_at: string;
  assigned_by: string;
}

export interface PolicySimulation {
  user_id: string;
  resource: string;
  operation: string;
  result: 'ALLOW' | 'DENY';
  trace: string[];
}

@Injectable()
export class AdminRbacService {
  private readonly logger = new Logger(AdminRbacService.name);

  // Built-in roles and their permissions
  private readonly builtInPermissions: Record<string, Record<string, string[]>> = {
    buyer: {
      quotes: ['view', 'create', 'edit', 'send'],
      dfm: ['view'],
      pricing: ['view'],
      orders: ['view'],
      finance: [],
      catalog: ['view'],
      system: [],
      users: [],
    },
    org_admin: {
      quotes: ['view', 'create', 'edit', 'send'],
      dfm: ['view', 'override'],
      pricing: ['view', 'override'],
      orders: ['view', 'progress'],
      finance: ['payments', 'refunds'],
      catalog: ['view', 'edit'],
      system: ['health'],
      users: ['invite', 'roles'],
    },
    reviewer: {
      quotes: ['view', 'edit'],
      dfm: ['view', 'override'],
      pricing: ['view'],
      orders: ['view'],
      finance: [],
      catalog: ['view'],
      system: [],
      users: [],
    },
    operator: {
      quotes: ['view', 'create', 'edit'],
      dfm: ['view', 'override'],
      pricing: ['view', 'override'],
      orders: ['view', 'progress'],
      finance: [],
      catalog: ['view', 'edit'],
      system: ['health', 'flags'],
      users: [],
    },
    finance: {
      quotes: ['view'],
      dfm: [],
      pricing: ['view'],
      orders: ['view', 'progress'],
      finance: ['payments', 'refunds'],
      catalog: [],
      system: [],
      users: [],
    },
    admin: {
      quotes: ['view', 'create', 'edit', 'send', 'override'],
      dfm: ['view', 'override'],
      pricing: ['view', 'override'],
      orders: ['view', 'progress', 'override'],
      finance: ['payments', 'refunds', 'override'],
      catalog: ['view', 'edit', 'override'],
      system: ['health', 'flags', 'keys', 'override'],
      users: ['invite', 'roles', 'override'],
    },
  };

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getRolesMatrix(): Promise<RolePermission[]> {
    const permissions: RolePermission[] = [];

    for (const [role, resources] of Object.entries(this.builtInPermissions)) {
      for (const [resource, operations] of Object.entries(resources)) {
        for (const operation of operations) {
          permissions.push({
            role,
            resource,
            operation,
            allowed: true,
          });
        }
      }
    }

    return permissions;
  }

  async getUserRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('organization_memberships')
        .select(`
          user_id,
          role,
          created_at,
          users!organization_memberships_user_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get user roles', error);
        return [];
      }

      return data?.map(row => ({
        user_id: row.user_id,
        role: row.role,
        assigned_at: row.created_at,
        assigned_by: 'system', // Would track this in a real implementation
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get user roles', error);
      return [];
    }
  }

  async assignUserRole(userId: string, role: string, assignedBy: string): Promise<void> {
    try {
      // Validate role exists
      if (!this.builtInPermissions[role]) {
        throw new BadRequestException(`Invalid role: ${role}`);
      }

      // Check if user exists
      const { data: user, error: userError } = await this.supabase.client
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new NotFoundException('User not found');
      }

      // Update role in organization membership
      const { error } = await this.supabase.client
        .from('organization_memberships')
        .update({
          role,
          last_role_change_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to assign user role', error);
        throw new BadRequestException('Failed to assign role');
      }
    } catch (error) {
      this.logger.error('Failed to assign user role', error);
      throw error;
    }
  }

  async disableUser(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('users')
        .update({
          status: 'disabled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        this.logger.error('Failed to disable user', error);
        throw new BadRequestException('Failed to disable user');
      }
    } catch (error) {
      this.logger.error('Failed to disable user', error);
      throw error;
    }
  }

  async simulatePolicy(userId: string, resource: string, operation: string): Promise<PolicySimulation> {
    try {
      // Get user's role
      const { data: membership, error } = await this.supabase.client
        .from('organization_memberships')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error || !membership) {
        return {
          user_id: userId,
          resource,
          operation,
          result: 'DENY',
          trace: ['User not found or no role assigned'],
        };
      }

      const role = membership.role;
      const permissions = this.builtInPermissions[role];

      if (!permissions) {
        return {
          user_id: userId,
          resource,
          operation,
          result: 'DENY',
          trace: [`Invalid role: ${role}`],
        };
      }

      const resourcePermissions = permissions[resource] || [];
      const allowed = resourcePermissions.includes(operation);

      return {
        user_id: userId,
        resource,
        operation,
        result: allowed ? 'ALLOW' : 'DENY',
        trace: [
          `User role: ${role}`,
          `Resource: ${resource}`,
          `Operation: ${operation}`,
          `Permissions for ${resource}: [${resourcePermissions.join(', ')}]`,
          `Result: ${allowed ? 'ALLOW' : 'DENY'}`,
        ],
      };
    } catch (error) {
      this.logger.error('Failed to simulate policy', error);
      return {
        user_id: userId,
        resource,
        operation,
        result: 'DENY',
        trace: ['Policy simulation failed'],
      };
    }
  }

  async getUsersList(): Promise<Array<{ id: string; name: string; email: string; role: string; last_active_at: string }>> {
    try {
      const { data, error } = await this.supabase.client
        .from('organization_memberships')
        .select(`
          user_id,
          role,
          users!organization_memberships_user_id_fkey(id, name, email, last_active_at)
        `)
        .order('users.name');

      if (error) {
        this.logger.error('Failed to get users list', error);
        return [];
      }

      return data?.map(row => ({
        id: row.user_id,
        name: (row.users as any)?.name || 'Unknown',
        email: (row.users as any)?.email || 'Unknown',
        role: row.role,
        last_active_at: (row.users as any)?.last_active_at || '',
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get users list', error);
      return [];
    }
  }

  validateRoleChange(currentUserRole: string, targetRole: string, targetUserId: string): boolean {
    // Admin role cannot be edited or downgraded by non-admin
    if (targetRole === 'admin' && currentUserRole !== 'admin') {
      return false;
    }

    // Must retain at least one admin in org
    if (currentUserRole === 'admin' && targetRole !== 'admin') {
      // Would check if this is the last admin - simplified for now
      return true;
    }

    return true;
  }
}
