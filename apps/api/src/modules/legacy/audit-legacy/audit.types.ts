export type AuditAction =
  | 'ORG_CREATED'
  | 'ORG_INVITE_SENT'
  | 'ORG_INVITE_ACCEPTED'
  | 'ROLE_CHANGED'
  | 'RBAC_POLICY_UPDATED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'QUOTE_CREATED'
  | 'QUOTE_STATUS_CHANGED'
  | 'QUOTE_REPRICED'
  | 'PAYMENT_METHOD_ADDED'
  | 'INVOICE_ISSUED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'ORG_SWITCH'
  | 'MATERIAL_CREATED'
  | 'MATERIAL_UPDATED'
  | 'MATERIAL_RETIRED'
  | 'MATERIAL_DUPLICATED'
  | 'MATERIAL_CACHE_INVALIDATED'
  | 'OUTCOME_SET'
  | 'OUTCOME_CLEARED'
  | 'MARGINS_FINALIZED'
  | 'QUOTE_EXPIRED'
  | 'QUOTE_EXPIRATION_EXTENDED'
  | 'REVISION_CREATED'
  | 'REVISION_RESTORED'
  | 'REVISION_ANNOTATED'
  | 'REVISION_COMPARE_VIEWED'
  | 'AI_ASSISTANT_REQUESTED'
  | 'AI_ASSISTANT_USAGE_SPIKE'
  | 'AI_ASSISTANT_RATE_LIMITED'
  | 'AI_ASSISTANT_APPROVED'
  | 'AI_ASSISTANT_REJECTED'
  | 'AI_ASSISTANT_APPROVAL_REQUIRED';

export type AuditResourceType =
  | 'org'
  | 'org_member'
  | 'policy'
  | 'quote'
  | 'quote_line'
  | 'quote_revision'
  | 'payment'
  | 'invoice'
  | 'file'
  | 'user'
  | 'material';

export interface AuditContext {
  orgId: string;
  userId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  ip?: string | null;
  ua?: string | null;
  path?: string | null;
  method?: string | null;
}

export interface AuditRecord {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  ctx: AuditContext;
}
