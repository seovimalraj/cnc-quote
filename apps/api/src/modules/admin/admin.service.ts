import { BadRequestException, Injectable } from "@nestjs/common";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { AdminMetricsService } from '../admin-metrics/admin-metrics.service';
import { ContractsV1 } from '@cnc-quote/shared';
import { AdminRiskComplianceService } from './admin-risk-compliance.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminMetrics: AdminMetricsService,
    private readonly supabase: SupabaseService,
    private readonly riskCompliance: AdminRiskComplianceService,
  ) {}

  async listUsers(page = 1, pageSize = 25, q?: string) {
    const pageNum = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
    const pageSizeNum = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.min(100, Number(pageSize))) : 25;
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let userQuery = this.supabase.client
      .from('users')
      .select('id, email, status, created_at, last_sign_in_at, name', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    const term = q?.trim();
    if (term) {
      userQuery = userQuery.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
    }

    const { data: users, count, error } = await userQuery;
    if (error) {
      throw error;
    }

    const userIds = (users ?? []).map((user) => user.id);
    const membershipMap = new Map<string, { organization_id: string; organization_name: string | null; role: string | null }>();

    if (userIds.length) {
      const { data: memberships, error: membershipError } = await this.supabase.client
        .from('organization_memberships')
        .select('user_id, role, organization_id, organizations:organization_id(name)')
        .in('user_id', userIds);

      if (membershipError) {
        throw membershipError;
      }

      (memberships ?? []).forEach((row: any) => {
        if (!membershipMap.has(row.user_id)) {
          membershipMap.set(row.user_id, {
            organization_id: row.organization_id,
            organization_name: row.organizations?.name ?? null,
            role: row.role ?? null,
          });
        }
      });
    }

    const formatted = (users ?? []).map((user) => {
      const membership = membershipMap.get(user.id) ?? null;
      return {
        id: user.id,
        email: user.email,
        status: user.status,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        name: user.name ?? null,
        org_id: membership?.organization_id ?? null,
        org: membership?.organization_name ?? null,
        role: membership?.role ?? null,
      };
    });

    return {
      data: formatted,
      total: count ?? formatted.length,
      page: pageNum,
      page_size: pageSizeNum,
      q: term ?? null,
    };
  }

  async listOrgs(page = 1, pageSize = 25, q?: string) {
    const pageNum = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
    const pageSizeNum = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.min(100, Number(pageSize))) : 25;
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let orgQuery = this.supabase.client
      .from('organizations')
      .select('id, name, plan, billing_status, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    const term = q?.trim();
    if (term) {
      orgQuery = orgQuery.or(`name.ilike.%${term}%,plan.ilike.%${term}%`);
    }

    const { data: organizations, count, error } = await orgQuery;
    if (error) {
      throw error;
    }

    const orgIds = (organizations ?? []).map((org) => org.id);
    const memberCounts = new Map<string, number>();

    if (orgIds.length) {
      const { data: membershipRows, error: membershipError } = await this.supabase.client
        .from('organization_memberships')
        .select('organization_id')
        .in('organization_id', orgIds);

      if (membershipError) {
        throw membershipError;
      }

      (membershipRows ?? []).forEach((row) => {
        const current = memberCounts.get(row.organization_id) ?? 0;
        memberCounts.set(row.organization_id, current + 1);
      });
    }

    const formatted = (organizations ?? []).map((org) => ({
      id: org.id,
      name: org.name,
      plan: org.plan,
      billing_status: org.billing_status,
      created_at: org.created_at,
      updated_at: org.updated_at ?? null,
      user_count: memberCounts.get(org.id) ?? 0,
    }));

    return {
      data: formatted,
      total: count ?? formatted.length,
      page: pageNum,
      page_size: pageSizeNum,
      q: term ?? null,
    };
  }
  async getReviewSummary(window: string = '1h') {
    const windowMs = this.parseTimeWindow(window);
    const since = new Date(Date.now() - windowMs).toISOString();

    type ReviewTaskRow = {
      id: string;
      quote_id: string;
      assignee_id: string | null;
      created_at: string | null;
      due_at: string | null;
      quote: {
        id: string;
        org_id: string | null;
        total_price: number | null;
        currency: string | null;
      } | null;
      rule: {
        sla_hours: number | null;
      } | null;
    };

    const { data: tasks, error } = await this.supabase.client
      .from('manual_review_tasks')
      .select(
        `
        id,
        quote_id,
        assignee_id,
        created_at,
        due_at,
        quote:quotes (
          id,
          org_id,
          total_price,
          currency
        ),
        rule:manual_review_rules (
          sla_hours
        )
      `,
      )
      .eq('status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      throw error;
    }

    const rows: ReviewTaskRow[] = tasks ?? [];
    const orgIds = Array.from(
      new Set(
        rows
          .map((row) => row.quote?.org_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const assigneeIds = Array.from(
      new Set(
        rows
          .map((row) => row.assignee_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    type OrgRow = { id: string; name: string | null };
    type UserRow = { id: string; email: string | null };

    const orgsResult = orgIds.length
      ? await this.supabase.client
          .from('organizations')
          .select('id, name')
          .in('id', orgIds)
      : ({ data: [] as OrgRow[], error: null } as const);

    const usersResult = assigneeIds.length
      ? await this.supabase.client
          .from('users')
          .select('id, email')
          .in('id', assigneeIds)
      : ({ data: [] as UserRow[], error: null } as const);

    if (orgsResult.error) {
      throw orgsResult.error;
    }

    if (usersResult.error) {
      throw usersResult.error;
    }

    const orgMap = new Map<string, string>(
      (orgsResult.data ?? []).map((org) => [org.id, org.name ?? 'Unknown org']),
    );
    const userMap = new Map<string, string>(
      (usersResult.data ?? []).map((user) => [user.id, user.email ?? user.id]),
    );

    const now = Date.now();
    const items = rows.map((row) => {
      const createdAt = row.created_at ? Date.parse(row.created_at) : now;
      const dueAtMs = row.due_at ? Date.parse(row.due_at) : null;
      const ageMinutes = Math.max(0, Math.floor((now - createdAt) / 60000));
      const breached = dueAtMs !== null ? dueAtMs < now : false;
      const slaMinutes = row.rule?.sla_hours != null ? row.rule.sla_hours * 60 : null;

      return {
        task_id: row.id,
        quote_id: row.quote_id,
        quote_number: null,
        org: row.quote?.org_id ? orgMap.get(row.quote.org_id) ?? row.quote.org_id : null,
        currency: row.quote?.currency ?? null,
        value: typeof row.quote?.total_price === 'number' ? row.quote.total_price : null,
        dfm_blockers: null,
        age_min: ageMinutes,
        sla_minutes: slaMinutes,
        breached,
        assignee: row.assignee_id ? userMap.get(row.assignee_id) ?? row.assignee_id : null,
        created_at: row.created_at,
        due_at: row.due_at,
      };
    });

    items.sort((a, b) => {
      if (a.breached !== b.breached) {
        return a.breached ? -1 : 1;
      }
      return b.age_min - a.age_min;
    });

    let newCount = 0;
    let agingCount = 0;
    let breachedCount = 0;

    for (const item of items) {
      if (item.breached) {
        breachedCount += 1;
        continue;
      }
      if (item.age_min <= 60) {
        newCount += 1;
      } else {
        agingCount += 1;
      }
    }

    return {
      window,
      count: items.length,
      new_count: newCount,
      aging_count: agingCount,
      breached_count: breachedCount,
      evaluated_at: new Date().toISOString(),
      items: items.slice(0, 25),
    };
  }

  async getDatabaseMetrics(window: string = '1h') {
    return this.adminMetrics.getDatabaseLatencySnapshot(window);
  }

  async getWebhookStatus(window: string = '1h') {
    const windowMs = this.parseTimeWindow(window);
    const since = new Date(Date.now() - windowMs).toISOString();

    type WebhookRow = {
      provider: string;
      status: string;
      failed_24h: number | null;
      last_event_type: string | null;
      last_delivery_at: string | null;
      updated_at: string;
    };

    const baseQuery = this.supabase.client
      .from('admin_webhook_status')
      .select('provider, status, failed_24h, last_event_type, last_delivery_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    const { data: inWindow, error: inWindowError } = await baseQuery.gte('updated_at', since);
    if (inWindowError) {
      throw inWindowError;
    }

    let rows: WebhookRow[] = inWindow ?? [];

    if (!rows.length) {
      const { data: fallbackRows, error: fallbackError } = await this.supabase.client
        .from('admin_webhook_status')
        .select('provider, status, failed_24h, last_event_type, last_delivery_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (fallbackError) {
        throw fallbackError;
      }

      rows = fallbackRows ?? [];
    }

    const now = Date.now();
    const seenProviders = new Set<string>();
    const items: Array<{ provider: string; status: string; failed_24h: number; last_event_type: string | null; last_delivery_age: number | null }> = [];

    for (const row of rows) {
      if (seenProviders.has(row.provider)) {
        continue;
      }
      seenProviders.add(row.provider);

      const ageSeconds = row.last_delivery_at ? Math.max(0, Math.round((now - Date.parse(row.last_delivery_at)) / 1000)) : null;
      items.push({
        provider: row.provider,
        status: row.status,
        failed_24h: row.failed_24h ?? 0,
        last_event_type: row.last_event_type ?? null,
        last_delivery_age: ageSeconds,
      });
    }

    return {
      window,
      evaluated_at: new Date().toISOString(),
      items,
    };
  }

  async replayWebhooks(provider: string, window: string = '24h') {
    const normalizedProvider = provider.toLowerCase();
    const updateResult = await this.supabase.client
      .from('admin_webhook_status')
      .update({
        failed_24h: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('provider', normalizedProvider)
      .select('provider')
      .limit(1);

    if (updateResult.error) {
      throw updateResult.error;
    }

    const replayed = updateResult.data?.length ? 1 : 0;

    return {
      provider: normalizedProvider,
      replayed,
      window_seconds: this.parseTimeWindow(window) / 1000,
    };
  }

  async getSLOMetrics(window: string = '1h') {
    const snapshot = await this.adminMetrics.getSloSnapshot(window);
    return snapshot;
  }

  async getRecentEvents(limit?: number): Promise<ContractsV1.AdminRecentEventsResponseV1> {
    const requested = typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : 10;
    const safeLimit = Math.max(1, Math.min(50, requested));

    type ActivityRow = {
      id: string;
      occurred_at: string;
      area?: string | null;
      action?: string | null;
      notes?: string | null;
      ip?: string | null;
      actor_role?: string | null;
      actor_id?: string | null;
      actor_user_id?: string | null;
      target_type?: string | null;
      target_id?: string | null;
      target_org_id?: string | null;
      org_id?: string | null;
      diff?: { before?: unknown; after?: unknown } | null;
      before?: unknown;
      after?: unknown;
      actor?: {
        name?: string | null;
        email?: string | null;
      } | null;
    };

    const rows = await this.fetchActivityRows<ActivityRow>(safeLimit);

    const events: ContractsV1.AdminRecentEventV1[] = rows.map((row) => {
      const actorCandidate = {
        id: row.actor_id ?? row.actor_user_id ?? null,
        role: row.actor_role ?? null,
        name: row.actor?.name ?? null,
        email: row.actor?.email ?? null,
      };

      const actor = actorCandidate.id || actorCandidate.role || actorCandidate.name || actorCandidate.email ? actorCandidate : null;

      const targetCandidate = {
        type: row.target_type ?? null,
        id: row.target_id ?? null,
        org_id: row.target_org_id ?? row.org_id ?? null,
      };

      const target = targetCandidate.type || targetCandidate.id || targetCandidate.org_id ? targetCandidate : null;

      const diffPayload = this.normalizeDiff(row);
      const alerts = this.riskCompliance.evaluate(
        {
          area: row.area,
          action: row.action,
          notes: row.notes,
          target_type: row.target_type,
          target_id: row.target_id,
        },
        diffPayload,
      );

      return {
        id: row.id,
        occurred_at: row.occurred_at,
        area: row.area ?? row.target_type ?? 'general',
        action: row.action ?? 'unknown',
        notes: row.notes ?? null,
        ip: row.ip ?? null,
        actor,
        target,
        diff: diffPayload,
        alerts: alerts.length ? alerts : null,
      } satisfies ContractsV1.AdminRecentEventV1;
    });

    return {
      fetched_at: new Date().toISOString(),
      limit: safeLimit,
      events,
    };
  }

  private async fetchActivityRows<TActivity extends Record<string, any>>(limit: number): Promise<TActivity[]> {
    const selectClause = `
      id,
      occurred_at,
      area,
      action,
      notes,
      ip,
      actor_id,
      actor_role,
      target_type,
      target_id,
      target_org_id,
      diff,
      actor:users!admin_activity_events_actor_id_fkey(name,email)
    `;

    const { data, error } = await this.supabase.client
      .from('admin_activity_events')
      .select(selectClause)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (!error) {
      return data ?? [];
    }

    // Backward compatibility: fall back to legacy audit_events when the new projection is unavailable.
    if (error.code === '42P01' || error.code === '42703') {
      return this.fetchActivityRowsFromAudit<TActivity>(limit);
    }

    throw error;
  }

  private normalizeDiff(row: {
    diff?: { before?: unknown; after?: unknown } | null;
    before?: unknown;
    after?: unknown;
  }): ContractsV1.AdminRecentEventDiffV1 | null {
    if (row.diff && typeof row.diff === 'object') {
      const before = 'before' in row.diff ? row.diff.before ?? null : null;
      const after = 'after' in row.diff ? row.diff.after ?? null : null;
      if (before !== null || after !== null) {
        return { before, after };
      }
    }

    if (row.before !== undefined || row.after !== undefined) {
      return {
        before: row.before ?? null,
        after: row.after ?? null,
      };
    }

    return null;
  }

  private async fetchActivityRowsFromAudit<TActivity extends Record<string, any>>(limit: number): Promise<TActivity[]> {
    const { data, error } = await this.supabase.client
      .from('audit_events')
      .select(`
        id,
        ts,
        area,
        action,
        notes,
        ip,
        actor_ip,
        actor_user_id,
        actor_role,
        target_type,
        target_id,
        org_id,
        before,
        after,
        actor:users!audit_events_actor_user_id_fkey(name,email)
      `)
      .order('ts', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

  return (data ?? []).map((row: any) => ({
      id: row.id,
      occurred_at: row.ts,
      area: row.area,
      action: row.action,
      notes: row.notes,
      ip: row.ip ?? row.actor_ip ?? null,
      actor_role: row.actor_role,
      actor_id: row.actor_user_id,
      actor_user_id: row.actor_user_id,
      target_type: row.target_type,
      target_id: row.target_id,
      target_org_id: row.org_id,
      org_id: row.org_id,
      before: row.before,
      after: row.after,
      diff: row.diff ?? (row.before !== undefined || row.after !== undefined
        ? { before: row.before ?? null, after: row.after ?? null }
        : null),
      actor: row.actor,
    })) as TActivity[];
  }

  async getErrors(window: string = '1h') {
    const windowMs = this.parseTimeWindow(window);
    const since = new Date(Date.now() - windowMs).toISOString();

    type ErrorRow = {
      id: string;
      service: string;
      title: string;
      count_1h: number | null;
      first_seen: string;
      last_seen: string;
      users_affected: number | null;
      permalink: string | null;
    };

    type FailedJobRow = {
      queue: string;
      job_id: string;
      attempts: number | null;
      reason: string | null;
      occurred_at: string;
    };

    const [{ data: errorRows, error: errorEventsError }, { data: failedJobRows, error: failedJobError }] = await Promise.all([
      this.supabase.client
        .from('admin_error_events')
        .select('id, service, title, count_1h, first_seen, last_seen, users_affected, permalink')
        .gte('last_seen', since)
        .order('last_seen', { ascending: false })
        .limit(50),
      this.supabase.client
        .from('admin_failed_jobs')
        .select('queue, job_id, attempts, reason, occurred_at')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(100),
    ]);

    if (errorEventsError) {
      throw errorEventsError;
    }

    if (failedJobError) {
      throw failedJobError;
    }

    const sentry = (errorRows ?? []).map((row) => ({
      id: row.id,
      service: row.service,
      title: row.title,
      count_1h: row.count_1h ?? 0,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      users_affected: row.users_affected,
      permalink: row.permalink,
    }));

    const failed_jobs = (failedJobRows ?? []).map((row) => ({
      when: row.occurred_at,
      queue: row.queue,
      job_id: row.job_id,
      attempts: row.attempts ?? 0,
      reason: row.reason,
    }));

    return {
      window,
      evaluated_at: new Date().toISOString(),
      sentry,
      failed_jobs,
    };
  }

  async createIssue(source: string, errorId: string) {
    if (!source) {
      throw new BadRequestException('source is required');
    }

    if (!errorId) {
      throw new BadRequestException('error_id is required');
    }

    const issueKey = `ADM-${Date.now()}`;
    const { data, error } = await this.supabase.client
      .from('admin_manual_issues')
      .insert({
        source,
        error_id: errorId,
        issue_key: issueKey,
        metadata: {},
      })
      .select('id, issue_key, status, created_at')
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      issue_id: data.id,
      issue_key: data.issue_key,
      status: data.status,
      created_at: data.created_at,
    };
  }

  private parseTimeWindow(window: string): number {
  const re = /^(\d+)([smhd])$/;
  const execResult = re.exec(window);
  if (!execResult) return 60 * 60 * 1000;
  const num = execResult[1];
  const unit = execResult[2];
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }
}
