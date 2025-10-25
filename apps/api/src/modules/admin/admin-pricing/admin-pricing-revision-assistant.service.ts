import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { ContractsV1, AdminPricingConfigSchema, sanitizePromptString } from '@cnc-quote/shared';
// Derive assistant types from shared zod schemas (avoids deep import runtime issues)
type AdminPricingRevisionAssistantRequestV1 = z.infer<
  typeof ContractsV1.AdminPricingRevisionAssistantRequestSchemaV1
>;
type AdminPricingRevisionAssistantAdjustmentV1 = z.infer<
  typeof ContractsV1.AdminPricingRevisionAssistantAdjustmentSchemaV1
>;
type AdminPricingRevisionAssistantApprovalDecisionV1 = z.infer<
  typeof ContractsV1.AdminPricingRevisionAssistantApprovalDecisionSchemaV1
>;
type AdminPricingRevisionDualControlStateV1 = z.infer<
  typeof ContractsV1.AdminPricingRevisionDualControlStateSchemaV1
>;
type AdminPricingRevisionAssistantApprovalV1 = z.infer<
  typeof ContractsV1.AdminPricingRevisionAssistantApprovalSchemaV1
>;
type AdminPricingRevisionAssistantApprovalRequestV1 = z.infer<
  typeof ContractsV1.AdminPricingRevisionAssistantApprovalRequestSchemaV1
>;
type AdminPricingRevisionAssistantRunV1 = z.infer<
  typeof ContractsV1.AdminPricingRevisionAssistantRunSchemaV1
>;
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { AuditService } from "../../legacy/audit-legacy/audit.service";
import { AdminFeatureFlagsService } from "../admin-feature-flags/admin-feature-flags.service";
import { AdminPricingService } from './admin-pricing.service';
import {
  ADMIN_PRICING_REVISION_QUEUE,
  ADMIN_PRICING_REVISION_JOB,
  AdminPricingRevisionAssistantJob,
} from './admin-pricing-revision.queue';
import {
  incrementRevisionAnomaly,
  incrementRevisionApproval,
  incrementRevisionRateLimited,
  incrementRevisionRequest,
  recordRevisionRequestLatency,
} from './admin-pricing-revision.metrics';

const FEATURE_FLAG_KEY = 'admin_pricing_revision_assistant';
const USAGE_MINUTE_WINDOW_SECONDS = 60;
const USAGE_MINUTE_THRESHOLD = 5; // Mirrors controller throttle (6/min) to surface spikes early
const USAGE_DAILY_WINDOW_SECONDS = 60 * 60 * 24;
const USAGE_DAILY_THRESHOLD = 40; // Detects sustained automation before it impacts approvals
const USAGE_ALERT_SUPPRESSION_SECONDS = 300;
const RATE_LIMIT_MINUTE_WINDOW_SECONDS = 60;
const RATE_LIMIT_MINUTE_THRESHOLD = 6;
const RATE_LIMIT_HOURLY_WINDOW_SECONDS = 60 * 60;
const RATE_LIMIT_HOURLY_THRESHOLD = 60;
const DUAL_CONTROL_APPROVAL_TARGET = 2;

type AdminPricingConfig = z.infer<typeof AdminPricingConfigSchema>;

interface RevisionRunRow {
  id: string;
  status: AdminPricingRevisionAssistantRunV1['status'];
  instructions: string;
  focus_areas: string[] | null;
  base_version: string;
  base_config: AdminPricingConfig;
  proposal_config?: AdminPricingConfig | null;
  adjustments?: AdminPricingRevisionAssistantAdjustmentV1[] | null;
  diff_summary?: string[] | null;
  notes?: string | null;
  error_message?: string | null;
  requested_by?: string | null;
  requested_by_email?: string | null;
  trace_id?: string | null;
  org_id?: string | null;
  feature_flag_key: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  approval_state?: AdminPricingRevisionDualControlStateV1 | null;
  approval_required?: boolean | null;
  proposal_digest?: string | null;
}

interface ApprovalRow {
  id: string;
  run_id: string;
  org_id: string;
  decision: AdminPricingRevisionAssistantApprovalDecisionV1;
  approved_by: string;
  approved_by_email?: string | null;
  approved_role?: string | null;
  notes?: string | null;
  trace_id?: string | null;
  created_at: string;
}

@Injectable()
export class AdminPricingRevisionAssistantService {
  private readonly logger = new Logger(AdminPricingRevisionAssistantService.name);
  private readonly tracer = trace.getTracer('api.admin-pricing-revision');

  constructor(
    private readonly supabase: SupabaseService,
    private readonly featureFlags: AdminFeatureFlagsService,
    private readonly adminPricing: AdminPricingService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    @InjectQueue(ADMIN_PRICING_REVISION_QUEUE)
    private readonly queue: Queue<AdminPricingRevisionAssistantJob>,
  ) {}

  async requestProposal(
    payload: AdminPricingRevisionAssistantRequestV1,
    user: any,
    traceId?: string,
  ): Promise<AdminPricingRevisionAssistantRunV1> {
    const startedAt = Date.now();
    const orgId = this.resolveOrgId(user);
    const userId = this.resolveUserId(user);
    const requesterEmail = this.resolveUserEmail(user);
    let success = false;
  let runContract: AdminPricingRevisionAssistantRunV1 | undefined;

    return this.tracer.startActiveSpan('ai.assistant.request', async (span) => {
      span.setAttribute('ai.feature_flag', FEATURE_FLAG_KEY);
      span.setAttribute('ai.org_id', orgId ?? 'unknown');
      if (userId) {
        span.setAttribute('ai.user_id', userId);
      }
      if (traceId) {
        span.setAttribute('ai.trace_id', traceId);
      }

      try {
        if (!orgId) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Organization context required' });
          throw new ForbiddenException('Organization context required for pricing revision assistant');
        }

        await this.assertFeatureEnabled(user, orgId);

        await this.enforceHardRateLimit({
          orgId,
          userId,
          traceId,
        });

        await this.ensureWorkerAvailable();

        const baseSnapshot = await this.adminPricing.getConfig();
        const baseConfig = baseSnapshot.config;
        const baseValidation = AdminPricingConfigSchema.safeParse(baseConfig);
        if (!baseValidation.success) {
          this.logger.error('Base pricing config failed validation before assistant run', baseValidation.error.flatten());
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Base config invalid' });
          throw new ForbiddenException('Base pricing configuration is invalid; cannot draft revisions');
        }

        const sanitizedInstructions = sanitizePromptString(payload.instructions ?? '');
        const resolvedInstructions = sanitizedInstructions.length > 0 ? sanitizedInstructions : '[scrubbed]';
        const sanitizedFocusAreas = (payload.focusAreas ?? [])
          .map((item) => sanitizePromptString(item))
          .filter((item) => item.length > 0);

        const resolvedTraceId = traceId ?? uuidv4();
        const instructionsDigest = this.hashInstructions(resolvedInstructions);
        const instructionsPreview = resolvedInstructions.slice(0, 120);

        const { data, error } = await this.supabase.client
          .from('admin_pricing_revision_runs')
          .insert({
            status: 'queued',
            instructions: resolvedInstructions,
            focus_areas: sanitizedFocusAreas.length ? sanitizedFocusAreas : null,
            base_version: baseSnapshot.version,
            base_config: baseValidation.data,
            feature_flag_key: FEATURE_FLAG_KEY,
            requested_by: userId,
            requested_by_email: requesterEmail,
            trace_id: resolvedTraceId,
            org_id: orgId,
          })
          .select('*')
          .limit(1);

        if (error) {
          this.logger.error('Failed to persist revision assistant run', error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Supabase insert failed' });
          throw new ForbiddenException('Unable to persist assistant run');
        }

        const row = data?.[0] as RevisionRunRow | undefined;
        if (!row) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Empty persistence payload' });
          throw new ForbiddenException('Assistant run persistence returned empty payload');
        }

        const effectiveTraceId = row.trace_id ?? resolvedTraceId;
        span.setAttribute('ai.run_id', row.id);

        const usageSnapshot = await this.recordUsageSignals({
          orgId,
          runId: row.id,
          traceId: effectiveTraceId,
          userId,
        });

        span.addEvent('usage_snapshot.recorded', {
          per_minute: usageSnapshot.minuteCount,
          per_day: usageSnapshot.dayCount,
        });

        await this.audit.log({
          action: 'AI_ASSISTANT_REQUESTED',
          resourceType: 'org',
          resourceId: orgId,
          before: {
            featureFlagKey: FEATURE_FLAG_KEY,
            baseVersion: baseSnapshot.version,
          },
          after: {
            runId: row.id,
            focusAreas: sanitizedFocusAreas,
            instructionsDigest,
            instructionsPreview,
            perMinuteUsageCount: usageSnapshot.minuteCount,
            perDayUsageCount: usageSnapshot.dayCount,
          },
          ctx: {
            orgId,
            userId: userId ?? null,
            traceId: effectiveTraceId ?? null,
          },
        });

        await this.enqueueRun(row.id, effectiveTraceId, {
          orgId,
          requestedBy: userId ?? null,
        });

        try {
          await this.audit.log({
            action: 'AI_ASSISTANT_APPROVAL_REQUIRED',
            resourceType: 'org',
            resourceId: orgId,
            before: {
              approvalsRequired: DUAL_CONTROL_APPROVAL_TARGET,
            },
            after: {
              runId: row.id,
              approvalsRequired: DUAL_CONTROL_APPROVAL_TARGET,
            },
            ctx: {
              orgId,
              userId: userId ?? null,
              traceId: effectiveTraceId ?? null,
            },
          });
        } catch (auditError) {
          this.logger.warn('Failed to log approval requirement event', auditError);
        }

        runContract = this.mapRowToContract(row);
        success = true;
        span.setStatus({ code: SpanStatusCode.OK });
        return runContract;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        incrementRevisionRequest({
          result: success ? 'success' : 'error',
          feature_flag: FEATURE_FLAG_KEY,
          org_id: orgId ?? 'unknown',
        });
        recordRevisionRequestLatency(Date.now() - startedAt, {
          result: success ? 'success' : 'error',
          feature_flag: FEATURE_FLAG_KEY,
          org_id: orgId ?? 'unknown',
        });
        span.end();
      }
    });
  }

  async getRun(runId: string, user: any): Promise<AdminPricingRevisionAssistantRunV1> {
    const orgId = this.resolveOrgId(user);
    if (!orgId) {
      throw new ForbiddenException('Organization context required to view revision assistant run');
    }

    await this.assertFeatureEnabled(user, orgId);

    const row = await this.fetchRunById(runId);
    if (!row || row.org_id !== orgId) {
      throw new NotFoundException('Revision assistant run not found');
    }

    const approvals = await this.fetchApprovalsForRuns([runId]);
    return this.mapRowToContract(row, approvals[runId] ?? []);
  }

  async listRuns(user: any, limit = 10): Promise<AdminPricingRevisionAssistantRunV1[]> {
    const orgId = this.resolveOrgId(user);
    if (!orgId) {
      throw new ForbiddenException('Organization context required to list revision assistant runs');
    }

    await this.assertFeatureEnabled(user, orgId);

    const { data, error } = await this.supabase.client
      .from('admin_pricing_revision_runs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.warn(`Failed to list revision assistant runs: ${error.message}`);
      return [];
    }

    const rows = (data ?? []) as RevisionRunRow[];
    const approvals = await this.fetchApprovalsForRuns(rows.map((row) => row.id));

    return rows
      .map((row) => this.mapRowToContract(row, approvals[row.id] ?? []))
      .filter(Boolean) as AdminPricingRevisionAssistantRunV1[];
  }

  async recordApproval(
    runId: string,
    payload: AdminPricingRevisionAssistantApprovalRequestV1,
    user: any,
    traceId?: string,
  ): Promise<AdminPricingRevisionAssistantRunV1> {
    const orgId = this.resolveOrgId(user);
    if (!orgId) {
      throw new ForbiddenException('Organization context required to approve revision assistant run');
    }

    await this.assertFeatureEnabled(user, orgId);

    const userId = this.resolveUserId(user);
    if (!userId) {
      throw new ForbiddenException('User context required to record approval');
    }

    const row = await this.fetchRunById(runId);
    if (!row || row.org_id !== orgId) {
      throw new NotFoundException('Revision assistant run not found');
    }

    if (row.status !== 'succeeded' || !row.proposal_config) {
      throw new BadRequestException('Only succeeded runs with proposals can be approved');
    }

    if (payload.decision === 'approved' && row.requested_by && row.requested_by === userId) {
      throw new ForbiddenException('Requesters cannot approve their own AI proposal');
    }

    const { error } = await this.supabase.client
      .from('admin_pricing_revision_approvals')
      .upsert(
        {
          org_id: orgId,
          run_id: runId,
          decision: payload.decision,
          approved_by: userId,
          approved_by_email: this.resolveUserEmail(user),
          approved_role: this.resolveUserRole(user),
          notes: payload.notes ?? null,
          trace_id: traceId ?? null,
        },
        { onConflict: 'run_id,approved_by' },
      );

    if (error) {
      this.logger.error('Failed to persist revision assistant approval', error);
      throw new BadRequestException('Failed to persist approval decision');
    }

    const approvals = await this.fetchApprovalsForRuns([runId]);
    const approvalRows = approvals[runId] ?? [];
    const nextState = this.deriveApprovalState(row, approvalRows);

    const { error: updateError } = await this.supabase.client
      .from('admin_pricing_revision_runs')
      .update({
        approval_state: nextState,
        approval_required: row.approval_required ?? true,
      })
      .eq('id', runId);

    if (updateError) {
      this.logger.warn('Failed to update approval state for revision assistant run', updateError);
    }

    const refreshedRow = (await this.fetchRunById(runId)) ?? row;
    const approvalContracts = approvals[runId] ?? [];

    try {
      await this.audit.log({
        action: payload.decision === 'approved' ? 'AI_ASSISTANT_APPROVED' : 'AI_ASSISTANT_REJECTED',
        resourceType: 'org',
        resourceId: orgId,
        before: {
          previousState: row.approval_state ?? 'pending',
          runId,
        },
        after: {
          decision: payload.decision,
          state: nextState,
          runId,
          approvals: approvalRows.length,
        },
        ctx: {
          orgId,
          userId,
          traceId: traceId ?? null,
        },
      });
    } catch (auditError) {
      this.logger.warn('Failed to write approval audit trail', auditError);
    }

    if (payload.decision === 'approved') {
      incrementRevisionApproval({
        feature_flag: FEATURE_FLAG_KEY,
        org_id: orgId,
        state: nextState,
      });
    }

    return this.mapRowToContract(refreshedRow, approvalContracts);
  }

  private async enqueueRun(
    runId: string,
    traceId?: string | null,
    metadata?: { orgId?: string | null; requestedBy?: string | null },
  ): Promise<void> {
    try {
      await this.queue.add(
        ADMIN_PRICING_REVISION_JOB,
        {
          version: 1,
          runId,
          traceId: traceId ?? null,
          orgId: metadata?.orgId ?? null,
          requestedBy: metadata?.requestedBy ?? null,
        },
        {
          jobId: `${ADMIN_PRICING_REVISION_QUEUE}:${runId}`,
          removeOnComplete: true,
          removeOnFail: 25,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to enqueue revision assistant job: ${(error as Error).message}`);
      throw new ForbiddenException('Unable to enqueue pricing revision assistant job');
    }
  }

  private async fetchRunById(runId: string): Promise<RevisionRunRow | null> {
    const { data, error } = await this.supabase.client
      .from('admin_pricing_revision_runs')
      .select('*')
      .eq('id', runId)
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.warn(`Failed to fetch revision assistant run ${runId}: ${error.message}`);
      return null;
    }

    return (data as RevisionRunRow | null) ?? null;
  }

  private async fetchApprovalsForRuns(runIds: string[]): Promise<Record<string, ApprovalRow[]>> {
    if (!runIds.length) {
      return {};
    }

    const { data, error } = await this.supabase.client
      .from('admin_pricing_revision_approvals')
      .select('*')
      .in('run_id', runIds);

    if (error) {
      this.logger.warn('Failed to fetch revision assistant approvals', error);
      return {};
    }

    const map = new Map<string, ApprovalRow[]>();
    for (const row of (data ?? []) as ApprovalRow[]) {
      if (!map.has(row.run_id)) {
        map.set(row.run_id, []);
      }
      map.get(row.run_id)!.push(row);
    }
    return Object.fromEntries(map.entries());
  }

  private mapApprovalRowToContract(row: ApprovalRow): AdminPricingRevisionAssistantApprovalV1 {
    return {
      approvalId: row.id,
      runId: row.run_id,
      decision: row.decision,
      approvedBy: row.approved_by,
      approvedByEmail: row.approved_by_email ?? undefined,
      approvedRole: row.approved_role ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private deriveApprovalState(
    row: RevisionRunRow,
    approvals: ApprovalRow[],
  ): AdminPricingRevisionDualControlStateV1 {
    if (row.approval_required === false || !row.proposal_config) {
      return 'not_required';
    }

    if (approvals.some((item) => item.decision === 'rejected')) {
      return 'rejected';
    }

    const uniqueApprovers = new Set(
      approvals.filter((item) => item.decision === 'approved').map((item) => item.approved_by),
    );
    if (uniqueApprovers.size >= DUAL_CONTROL_APPROVAL_TARGET) {
      return 'approved';
    }

    return 'pending';
  }

  private async ensureWorkerAvailable(): Promise<void> {
    let workers: unknown[];
    try {
      workers = await this.queue.getWorkers();
    } catch (error) {
      this.logger.error('Failed to verify revision assistant worker availability', error);
      throw new ForbiddenException('Pricing revision assistant worker unavailable');
    }

    if (!workers || workers.length === 0) {
      this.logger.warn('Revision assistant queue has no active workers; rejecting proposal request');
      throw new ForbiddenException('Pricing revision assistant worker unavailable');
    }
  }

  private mapRowToContract(row: RevisionRunRow, approvals: ApprovalRow[] = []): AdminPricingRevisionAssistantRunV1 {
    let proposalConfig: AdminPricingConfig | undefined;
    if (row.proposal_config) {
      const parsed = AdminPricingConfigSchema.safeParse(row.proposal_config);
      if (parsed.success) {
        proposalConfig = parsed.data;
      } else {
        this.logger.debug('Stored proposal config failed validation; omitting from response', {
          runId: row.id,
        });
      }
    }

    const adjustments = Array.isArray(row.adjustments)
      ? (row.adjustments as AdminPricingRevisionAssistantAdjustmentV1[])
      : undefined;

  const dualControlState = this.deriveApprovalState(row, approvals);
  const approvalRequired = row.approval_required ?? Boolean(row.proposal_config);
    const approvalContracts = approvals.map((item) => this.mapApprovalRowToContract(item));

    return {
      runId: row.id,
      status: row.status,
      instructions: row.instructions,
      focusAreas: row.focus_areas ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      baseVersion: row.base_version,
      proposalConfig,
      adjustments,
      diffSummary: Array.isArray(row.diff_summary) ? row.diff_summary : undefined,
      notes: row.notes ?? undefined,
      error: row.error_message ?? undefined,
      approvalState: dualControlState,
  approvalRequired,
      approvals: approvalContracts.length ? approvalContracts : undefined,
      proposalDigest: row.proposal_digest ?? undefined,
    };
  }

  private async isEnabledForUser(user: any, orgId?: string | null): Promise<boolean> {
    const resolvedOrgId = orgId ?? this.resolveOrgId(user);
    if (!resolvedOrgId) {
      return false;
    }

    const flag = await this.featureFlags.evaluateFeatureFlag(FEATURE_FLAG_KEY, {
      organization_id: resolvedOrgId,
      user_id: this.resolveUserId(user) ?? undefined,
      user_role: this.resolveUserRole(user) ?? undefined,
      environment: process.env.NODE_ENV,
    });

    return flag.enabled;
  }

  private async assertFeatureEnabled(user: any, orgId: string): Promise<void> {
    const enabled = await this.isEnabledForUser(user, orgId);
    if (!enabled) {
      throw new ForbiddenException('Pricing revision assistant is disabled');
    }
  }

  private async enforceHardRateLimit(params: {
    orgId: string;
    userId?: string | null;
    traceId?: string | null;
  }): Promise<void> {
    const attributes = {
      feature_flag: FEATURE_FLAG_KEY,
      org_id: params.orgId,
    };

    try {
      const minuteKey = this.buildRateLimitKey(params.orgId, 'minute');
      const minuteCount = await this.cache.increment(minuteKey, RATE_LIMIT_MINUTE_WINDOW_SECONDS);
      if (minuteCount > RATE_LIMIT_MINUTE_THRESHOLD) {
        await this.handleRateLimitBreach({
          orgId: params.orgId,
          userId: params.userId ?? null,
          traceId: params.traceId ?? null,
          window: 'minute',
          threshold: RATE_LIMIT_MINUTE_THRESHOLD,
          count: minuteCount,
        });
  incrementRevisionRateLimited({ ...attributes, window: 'minute' });
  throw new HttpException('Pricing revision assistant rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }

      const hourKey = this.buildRateLimitKey(params.orgId, 'hour');
      const hourCount = await this.cache.increment(hourKey, RATE_LIMIT_HOURLY_WINDOW_SECONDS);
      if (hourCount > RATE_LIMIT_HOURLY_THRESHOLD) {
        await this.handleRateLimitBreach({
          orgId: params.orgId,
          userId: params.userId ?? null,
          traceId: params.traceId ?? null,
          window: 'hour',
          threshold: RATE_LIMIT_HOURLY_THRESHOLD,
          count: hourCount,
        });
  incrementRevisionRateLimited({ ...attributes, window: 'hour' });
  throw new HttpException('Pricing revision assistant rate limit exceeded (per hour)', HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (error) {
      if (error instanceof HttpException && error.getStatus && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }
      this.logger.warn('Failed to enforce pricing revision assistant rate limit', error);
    }
  }

  private async handleRateLimitBreach(params: {
    orgId: string;
    userId?: string | null;
    traceId?: string | null;
    window: 'minute' | 'hour';
    threshold: number;
    count: number;
  }): Promise<void> {
    try {
      await this.audit.log({
        action: 'AI_ASSISTANT_RATE_LIMITED',
        resourceType: 'org',
        resourceId: params.orgId,
        before: {
          window: params.window,
          threshold: params.threshold,
        },
        after: {
          window: params.window,
          threshold: params.threshold,
          count: params.count,
        },
        ctx: {
          orgId: params.orgId,
          userId: params.userId ?? null,
          traceId: params.traceId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to persist rate limit audit event', error);
    }

    this.logger.warn('Pricing revision assistant rate limit breached', {
      orgId: params.orgId,
      window: params.window,
      count: params.count,
      threshold: params.threshold,
    });
  }

  private async recordUsageSignals(params: {
    orgId: string;
    runId: string;
    traceId?: string | null;
    userId?: string | null;
  }): Promise<{ minuteCount: number; dayCount: number }> {
    try {
      const minuteKey = this.buildUsageKey(params.orgId, 'minute');
      const dayKey = this.buildUsageKey(params.orgId, 'day');

      const minuteCount = await this.cache.increment(minuteKey, USAGE_MINUTE_WINDOW_SECONDS);
      const dayCount = await this.cache.increment(dayKey, USAGE_DAILY_WINDOW_SECONDS);

      await this.maybeEmitUsageSpike({
        window: 'minute',
        cacheKey: minuteKey,
        count: minuteCount,
        threshold: USAGE_MINUTE_THRESHOLD,
        orgId: params.orgId,
        runId: params.runId,
        traceId: params.traceId,
        userId: params.userId,
      });

      await this.maybeEmitUsageSpike({
        window: 'day',
        cacheKey: dayKey,
        count: dayCount,
        threshold: USAGE_DAILY_THRESHOLD,
        orgId: params.orgId,
        runId: params.runId,
        traceId: params.traceId,
        userId: params.userId,
      });

      return { minuteCount, dayCount };
    } catch (error) {
      this.logger.warn('Failed to record revision assistant usage metrics', error);
      return { minuteCount: 0, dayCount: 0 };
    }
  }

  private async maybeEmitUsageSpike(params: {
    window: 'minute' | 'day';
    cacheKey: string;
    count: number;
    threshold: number;
    orgId: string;
    runId: string;
    traceId?: string | null;
    userId?: string | null;
  }): Promise<void> {
    if (params.threshold <= 0 || params.count < params.threshold) {
      return;
    }

    const alertKey = `${params.cacheKey}:alerted`;
    const alreadyAlerted = await this.cache.get<boolean>(alertKey);
    if (alreadyAlerted) {
      return;
    }

    try {
      await this.audit.log({
        action: 'AI_ASSISTANT_USAGE_SPIKE',
        resourceType: 'org',
        resourceId: params.orgId,
        before: {
          window: params.window,
          threshold: params.threshold,
          previousCount: Math.max(params.count - 1, 0),
        },
        after: {
          window: params.window,
          threshold: params.threshold,
          count: params.count,
          runId: params.runId,
        },
        ctx: {
          orgId: params.orgId,
          userId: params.userId ?? null,
          traceId: params.traceId ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to persist audit spike event', error);
    }

    try {
      await this.cache.set(alertKey, true, USAGE_ALERT_SUPPRESSION_SECONDS);
    } catch (error) {
      this.logger.warn('Failed to set spike suppression flag', error);
    }

    incrementRevisionAnomaly({
      feature_flag: FEATURE_FLAG_KEY,
      org_id: params.orgId,
      window: params.window,
    });

    this.logger.warn(`Detected ${params.window} usage spike for pricing revision assistant`, {
      orgId: params.orgId,
      count: params.count,
      threshold: params.threshold,
    });
  }

  private buildUsageKey(orgId: string, window: 'minute' | 'day'): string {
    return `admin-pricing-revision-assistant:usage:${orgId}:${window}`;
  }

  private buildRateLimitKey(orgId: string, window: 'minute' | 'hour'): string {
    return `admin-pricing-revision-assistant:ratelimit:${orgId}:${window}`;
  }

  private resolveOrgId(user: any): string | null {
    return user?.orgId ?? user?.organizationId ?? user?.organization_id ?? null;
  }

  private resolveUserId(user: any): string | null {
    return user?.userId ?? user?.id ?? null;
  }

  private resolveUserEmail(user: any): string | null {
    return user?.email ?? user?.emailAddress ?? null;
  }

  private resolveUserRole(user: any): string | null {
    if (typeof user?.role === 'string') {
      return user.role;
    }
    if (Array.isArray(user?.roles) && user.roles.length > 0) {
      return user.roles[0];
    }
    return null;
  }

  private hashInstructions(value: string): string {
    if (!value) {
      return '';
    }

    return createHash('sha256').update(value).digest('hex');
  }
}
