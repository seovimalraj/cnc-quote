export type Role =
  | 'admin'
  | 'engineer'
  | 'buyer'
  | 'auditor'
  | 'finance'
  | 'ops'
  | 'org_admin'
  | 'reviewer';

export const ROLES: Role[] = [
  'admin',
  'engineer',
  'buyer',
  'auditor',
  'finance',
  'ops',
  'org_admin',
  'reviewer',
];

export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'approve';

export type RolePermissionMatrix = Partial<Record<Role, PermissionAction[]>>;

export type ResourcePermissionEntry = {
  resource: string;
} & RolePermissionMatrix;

export const PERMISSION_MATRIX: ResourcePermissionEntry[] = [
  {
    resource: 'quote',
    admin: ['read', 'create', 'update', 'delete'],
    engineer: ['read', 'create', 'update'],
    buyer: ['read', 'create'],
    auditor: ['read'],
    finance: ['read'],
    org_admin: ['read', 'update'],
  },
  {
    resource: 'quote_item',
    admin: ['read', 'create', 'update', 'delete'],
    engineer: ['read', 'create', 'update'],
    buyer: ['read'],
    auditor: ['read'],
    finance: ['read'],
    org_admin: ['read', 'update'],
  },
  {
    resource: 'pricing_admin',
    admin: ['read', 'update'],
    engineer: [],
    buyer: [],
    reviewer: ['read'],
    org_admin: ['read', 'update'],
  },
  {
    resource: 'supplier',
    admin: ['read', 'create', 'update'],
    engineer: ['read'],
    buyer: [],
    ops: ['read', 'update'],
    org_admin: ['read', 'update'],
  },
  {
    resource: 'invoice',
    admin: ['read', 'create', 'update'],
    engineer: ['read'],
    buyer: ['read'],
    finance: ['read', 'update'],
    auditor: ['read'],
  },
  {
    resource: 'purchase_order',
    admin: ['read', 'create', 'update', 'approve'],
    engineer: ['read'],
    buyer: ['read', 'create'],
    ops: ['read', 'update'],
    finance: ['read'],
  },
  {
    resource: 'material_properties',
    admin: ['read', 'create', 'update'],
    engineer: ['read'],
    buyer: [],
    ops: ['read'],
    reviewer: ['read'],
  },
  {
    resource: 'tolerance_bands',
    admin: ['read', 'create', 'update'],
    engineer: ['read'],
    buyer: [],
    reviewer: ['read'],
  },
  {
    resource: 'user_invite',
    admin: ['create', 'delete'],
    engineer: [],
    buyer: [],
    org_admin: ['create', 'delete'],
  },
];

const matrixMap: Record<string, Record<Role, Set<PermissionAction>>> = {};
for (const row of PERMISSION_MATRIX) {
  const roleMap = {} as Record<Role, Set<PermissionAction>>;
  for (const role of ROLES) {
    const actions = row[role] ?? [];
    roleMap[role] = new Set(actions);
  }
  matrixMap[row.resource] = roleMap;
}

export function can(role: Role, resource: string, action: PermissionAction): boolean {
  const entry = matrixMap[resource];
  if (!entry) return false;
  return entry[role]?.has(action) || false;
}

export interface RbacCheckContext {
  role: Role;
  orgId: string;
  userId: string;
}

export function assertCan(role: Role, resource: string, action: PermissionAction) {
  if (!can(role, resource, action)) {
    const err: any = new Error('RBAC_FORBIDDEN');
    err.code = 'RBAC_FORBIDDEN';
    err.meta = { role, resource, action };
    throw err;
  }
}
