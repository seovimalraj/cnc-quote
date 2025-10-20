// Admin event contracts (v1)
// These describe normalized audit events for surfaced admin activity feeds.

export interface AdminRecentEventDiffV1 {
  before?: unknown;
  after?: unknown;
}

export type AdminRecentEventAlertSeverityV1 = 'info' | 'warning' | 'critical';

export interface AdminRecentEventAlertV1 {
  code: 'pricing_delta' | 'lead_time_override' | 'anomaly';
  severity: AdminRecentEventAlertSeverityV1;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AdminRecentEventActorV1 {
  id?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface AdminRecentEventTargetV1 {
  type?: string | null;
  id?: string | null;
  org_id?: string | null;
}

export interface AdminRecentEventV1 {
  id: string;
  occurred_at: string; // ISO timestamp
  area: string;
  action: string;
  notes?: string | null;
  ip?: string | null;
  actor?: AdminRecentEventActorV1 | null;
  target?: AdminRecentEventTargetV1 | null;
  diff?: AdminRecentEventDiffV1 | null;
  alerts?: AdminRecentEventAlertV1[] | null;
}

export interface AdminRecentEventsResponseV1 {
  fetched_at: string;
  limit: number;
  events: AdminRecentEventV1[];
}
