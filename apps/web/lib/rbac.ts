/**
 * Frontend RBAC Utilities
 * 
 * Provides role-based access control helpers for the frontend.
 * Synchronizes with backend policy system in apps/api/src/auth/policies.guard.ts
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Role definitions - must match backend roles table
export type UserRole = 
  | 'buyer'
  | 'org_admin'
  | 'reviewer'
  | 'finance'
  | 'auditor'
  | 'admin'
  | 'partner';

// Policy requirement structure
export interface PolicyRequirement {
  action: string;
  resource: string;
}

// Role-to-policies mapping (client-side cache)
// This should be kept in sync with backend role_policies table
const ROLE_PERMISSIONS: Record<UserRole, PolicyRequirement[]> = {
  buyer: [
    { action: 'create', resource: 'quotes' },
    { action: 'view', resource: 'quotes' },
    { action: 'update', resource: 'quotes' },
    { action: 'view', resource: 'dfm' },
    { action: 'view', resource: 'pricing' },
    { action: 'create', resource: 'orders' },
    { action: 'view', resource: 'orders' },
  ],
  org_admin: [
    { action: '*', resource: 'quotes' },
    { action: '*', resource: 'orders' },
    { action: 'invite', resource: 'users' },
    { action: 'change_role', resource: 'users' },
    { action: 'override', resource: 'pricing' },
    { action: 'override', resource: 'dfm' },
    { action: 'view', resource: 'payments' },
    { action: 'refund', resource: 'payments' },
    { action: 'edit', resource: 'catalog' },
    { action: 'view', resource: 'health' },
  ],
  reviewer: [
    { action: 'view', resource: 'quotes' },
    { action: 'edit', resource: 'quotes' },
    { action: 'override', resource: 'dfm' },
    { action: 'view', resource: 'pricing' },
    { action: 'view', resource: 'orders' },
    { action: 'progress', resource: 'orders' },
    { action: 'view', resource: 'catalog' },
  ],
  finance: [
    { action: 'view', resource: 'payments' },
    { action: 'create', resource: 'payments' },
    { action: 'refund', resource: 'payments' },
    { action: 'override', resource: 'pricing' },
    { action: 'view', resource: 'catalog' },
    { action: 'edit', resource: 'catalog' },
  ],
  auditor: [
    { action: 'view', resource: 'audit' },
    { action: 'view', resource: 'quotes' },
    { action: 'view', resource: 'orders' },
  ],
  admin: [
    { action: '*', resource: '*' }, // Admin wildcard
  ],
  partner: [
    { action: 'view', resource: 'orders' },
    { action: 'update', resource: 'orders' },
    { action: 'create', resource: 'shipments' },
    { action: 'update', resource: 'shipments' },
  ],
};

/**
 * Check if user has permission to perform an action on a resource
 * 
 * @param role - User's role
 * @param action - Action to perform (e.g., 'create', 'view', 'update', 'delete')
 * @param resource - Resource type (e.g., 'quotes', 'orders', 'users')
 * @returns true if user has permission, false otherwise
 */
export function can(role: UserRole | undefined, action: string, resource: string): boolean {
  if (!role) return false;

  // Admin wildcard: admins can do everything
  if (role === 'admin') return true;

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  return permissions.some(policy => {
    // Check for wildcard matches
    const actionMatch = policy.action === '*' || policy.action === action;
    const resourceMatch = policy.resource === '*' || policy.resource === resource;
    return actionMatch && resourceMatch;
  });
}

/**
 * React hook for permission checking
 * 
 * @returns Object with user role and can() function
 * 
 * @example
 * ```tsx
 * const { role, can } = usePermissions();
 * 
 * if (can('create', 'quotes')) {
 *   return <CreateQuoteButton />;
 * }
 * ```
 */
export function usePermissions() {
  const { data: session } = useSession();
  const [role, setRole] = useState<UserRole | undefined>();

  useEffect(() => {
    // Extract role from JWT token or session
    if (session?.user) {
      const userRole = (session.user as any).role as UserRole;
      setRole(userRole);
    } else {
      setRole(undefined);
    }
  }, [session]);

  return {
    role,
    can: (action: string, resource: string) => can(role, action, resource),
  };
}

/**
 * React hook for checking if user is at least a certain role level
 * 
 * Role hierarchy (ascending privilege):
 * 1. buyer
 * 2. reviewer
 * 3. finance
 * 4. org_admin
 * 5. admin
 * 
 * @param minRole - Minimum required role
 * @returns true if user has at least the specified role level
 * 
 * @example
 * ```tsx
 * const isAdmin = useRoleCheck('org_admin');
 * if (isAdmin) {
 *   return <AdminPanel />;
 * }
 * ```
 */
export function useRoleCheck(minRole: UserRole): boolean {
  const { role } = usePermissions();
  
  const roleHierarchy: Record<UserRole, number> = {
    buyer: 1,
    partner: 2,
    auditor: 2,
    reviewer: 3,
    finance: 4,
    org_admin: 5,
    admin: 10,
  };

  if (!role) return false;
  
  const userLevel = roleHierarchy[role] || 0;
  const requiredLevel = roleHierarchy[minRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Higher-order component for protecting routes with role-based access
 * 
 * @example
 * ```tsx
 * export default withRoleProtection(MyPage, 'org_admin');
 * ```
 */
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: UserRole
) {
  return function ProtectedComponent(props: P) {
    const hasRole = useRoleCheck(requiredRole);
    const { data: session, status } = useSession();

    if (status === 'loading') {
      return <div>Loading...</div>;
    }

    if (!session) {
      return <div>Please sign in to access this page.</div>;
    }

    if (!hasRole) {
      return <div>You do not have permission to access this page.</div>;
    }

    return <Component {...props} />;
  };
}

/**
 * React component for conditional rendering based on permissions
 * 
 * @example
 * ```tsx
 * <PermissionGate action="create" resource="quotes">
 *   <CreateQuoteButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  action,
  resource,
  children,
  fallback = null,
}: {
  action: string;
  resource: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can: checkPermission } = usePermissions();

  if (checkPermission(action, resource)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Get human-readable role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    buyer: 'Buyer',
    org_admin: 'Organization Admin',
    reviewer: 'Reviewer',
    finance: 'Finance Manager',
    auditor: 'Auditor',
    admin: 'Platform Admin',
    partner: 'Supplier Partner',
  };
  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    buyer: 'Can create quotes and orders',
    org_admin: 'Full access to manage organization, members, and override settings',
    reviewer: 'Can review and approve quotes, override DFM recommendations',
    finance: 'Can manage payments, refunds, and view financial data',
    auditor: 'Read-only access to audit logs and historical data',
    admin: 'Platform administrator with unrestricted access',
    partner: 'Supplier partner with limited access to orders and shipments',
  };
  return descriptions[role] || 'No description available';
}

/**
 * Get all available roles for a dropdown
 */
export function getAllRoles(): Array<{ value: UserRole; label: string; description: string }> {
  return (Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(role => ({
    value: role,
    label: getRoleDisplayName(role),
    description: getRoleDescription(role),
  }));
}
