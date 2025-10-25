import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { OrgGuard } from "../../core/auth/org.guard";
import { RbacGuard } from "../../core/auth/rbac.middleware";
import { ReqUser } from "../../core/auth/req-user.decorator";
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { PRICING_RECALC_JOB } from "../../../lib/pricing-core/pricing-recalc.queue";
import type { ContractsV1 } from '@cnc-quote/shared';
import { PricingRecalcService } from "../../../lib/pricing-core/pricing-recalc.service";

type PricingRecalcJob = ContractsV1.PricingRecalcJobV1;

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, OrgGuard)
export class AdminPricingRecalcController {
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue('pricing') private readonly pricingQueue: Queue,
    private readonly recalc: PricingRecalcService,
  ) {}

  @Get('recalc-runs')
  @UseGuards(RbacGuard('admin:read', 'org'))
  async listRuns(@ReqUser() user: any) {
    const orgId = user?.orgId ?? user?.organizationId ?? user?.organization_id;
    const { data, error } = await this.supabase.client
      .from('admin_pricing_recalc_runs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data ?? [];
  }

  @Get('recalc-runs/:id')
  @UseGuards(RbacGuard('admin:read', 'org'))
  async getRun(@Param('id') id: string, @ReqUser() user: any) {
    const orgId = user?.orgId ?? user?.organizationId ?? user?.organization_id;
    const { data: run, error: runErr } = await this.supabase.client
      .from('admin_pricing_recalc_runs')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (runErr) throw new HttpException(runErr.message, HttpStatus.INTERNAL_SERVER_ERROR);
    const { data: items, error: itemsErr } = await this.supabase.client
      .from('admin_pricing_recalc_items')
      .select('*')
      .eq('run_id', id)
      .order('created_at', { ascending: true });
    if (itemsErr) throw new HttpException(itemsErr.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return { run, items: items ?? [] };
  }

  @Post('recalc')
  @UseGuards(RbacGuard('admin:update', 'org'))
  async triggerRecalc(@Body() body: Partial<PricingRecalcJob>, @ReqUser() user: any) {
    const orgId = user?.orgId ?? user?.organizationId ?? user?.organization_id;
    const params = {
      orgId,
      requestedBy: user?.userId ?? null,
      reason: (body.reason as any) || 'manual',
      dryRun: Boolean(body.dryRun),
      targetQuoteIds: Array.isArray(body.targetQuoteIds) ? body.targetQuoteIds : null,
      materials: Array.isArray(body.materials) ? body.materials : null,
      processes: Array.isArray(body.processes) ? body.processes : null,
      machineGroups: Array.isArray(body.machineGroups) ? body.machineGroups : null,
      createdFrom: typeof body.createdFrom === 'string' ? body.createdFrom : null,
      createdTo: typeof body.createdTo === 'string' ? body.createdTo : null,
      traceId: typeof body.traceId === 'string' ? body.traceId : null,
    } as const;

    const { runId } = await this.recalc.enqueueRun(params as any);
    return { enqueued: true, runId };
  }

  @Post('recalc/preview')
  @UseGuards(RbacGuard('admin:read', 'org'))
  async previewRecalc(@Body() body: Partial<PricingRecalcJob>, @ReqUser() user: any) {
    const orgId = user?.orgId ?? user?.organizationId ?? user?.organization_id;

    // Build scoped query mirroring the worker's eligibility logic
    let query = this.supabase.client
      .from('quote_items')
      .select('id, quotes!inner(org_id)', { count: 'exact', head: true })
      .eq('quotes.org_id', orgId);

    if (Array.isArray(body.targetQuoteIds) && body.targetQuoteIds.length > 0) {
      query = query.in('quote_id', body.targetQuoteIds);
    }

    if (Array.isArray(body.materials) && body.materials.length > 0) {
      query = query.or(
        body.materials
          .map((code) => `config_json->>material_id.eq.${code}`)
          .join(',')
      );
    }

    if (Array.isArray(body.processes) && body.processes.length > 0) {
      query = query.or(
        body.processes
          .map((p) => `config_json->>process_type.eq.${p}`)
          .join(',')
      );
    }

    if (typeof body.createdFrom === 'string' && body.createdFrom) {
      query = query.gte('quote_items.created_at', body.createdFrom);
    }
    if (typeof body.createdTo === 'string' && body.createdTo) {
      query = query.lte('quote_items.created_at', body.createdTo);
    }

    const { count, error } = await query;
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    // Sample first-100 unique quote IDs (distinct over quote_id)
    let sampleQuery = this.supabase.client
      .from('quote_items')
      .select('quote_id, quotes!inner(org_id)')
      .eq('quotes.org_id', orgId);
    if (Array.isArray(body.targetQuoteIds) && body.targetQuoteIds.length > 0) {
      sampleQuery = sampleQuery.in('quote_id', body.targetQuoteIds);
    }
    if (Array.isArray(body.materials) && body.materials.length > 0) {
      sampleQuery = sampleQuery.or(
        body.materials
          .map((code) => `config_json->>material_id.eq.${code}`)
          .join(',')
      );
    }
    if (Array.isArray(body.processes) && body.processes.length > 0) {
      sampleQuery = sampleQuery.or(
        body.processes
          .map((p) => `config_json->>process_type.eq.${p}`)
          .join(',')
      );
    }
    if (typeof body.createdFrom === 'string' && body.createdFrom) {
      sampleQuery = sampleQuery.gte('quote_items.created_at', body.createdFrom);
    }
    if (typeof body.createdTo === 'string' && body.createdTo) {
      sampleQuery = sampleQuery.lte('quote_items.created_at', body.createdTo);
    }
  const { data: sampleRows, error: sampleErr } = await sampleQuery.order('quote_id', { ascending: true }).limit(500);
    if (sampleErr) throw new HttpException(sampleErr.message, HttpStatus.INTERNAL_SERVER_ERROR);
  const sampleQuoteIds = Array.from(new Set(((sampleRows ?? []) as any[]).map((r: any) => r.quote_id))).slice(0, 100);

    // Min/Max created_at across eligible items
    const minQueryBase = this.supabase.client
      .from('quote_items')
      .select('created_at, quotes!inner(org_id)')
      .eq('quotes.org_id', orgId);
    const maxQueryBase = this.supabase.client
      .from('quote_items')
      .select('created_at, quotes!inner(org_id)')
      .eq('quotes.org_id', orgId);

    const applyFilters = (q: any) => {
      let qq = q;
      if (Array.isArray(body.targetQuoteIds) && body.targetQuoteIds.length > 0) {
        qq = qq.in('quote_id', body.targetQuoteIds);
      }
      if (Array.isArray(body.materials) && body.materials.length > 0) {
        qq = qq.or(
          body.materials
            .map((code) => `config_json->>material_id.eq.${code}`)
            .join(',')
        );
      }
      if (Array.isArray(body.processes) && body.processes.length > 0) {
        qq = qq.or(
          body.processes
            .map((p) => `config_json->>process_type.eq.${p}`)
            .join(',')
        );
      }
      if (typeof body.createdFrom === 'string' && body.createdFrom) {
        qq = qq.gte('quote_items.created_at', body.createdFrom);
      }
      if (typeof body.createdTo === 'string' && body.createdTo) {
        qq = qq.lte('quote_items.created_at', body.createdTo);
      }
      return qq;
    };

    const { data: minRows, error: minErr } = await applyFilters(minQueryBase)
      .order('created_at', { ascending: true })
      .limit(1);
    if (minErr) throw new HttpException(minErr.message, HttpStatus.INTERNAL_SERVER_ERROR);
    const { data: maxRows, error: maxErr } = await applyFilters(maxQueryBase)
      .order('created_at', { ascending: false })
      .limit(1);
    if (maxErr) throw new HttpException(maxErr.message, HttpStatus.INTERNAL_SERVER_ERROR);

    const minCreatedAt = (minRows?.[0] as any)?.created_at ?? null;
    const maxCreatedAt = (maxRows?.[0] as any)?.created_at ?? null;

    return { eligibleCount: count ?? 0, sampleQuoteIds, minCreatedAt, maxCreatedAt };
  }

  @Post('recalc/:id/cancel')
  @UseGuards(RbacGuard('admin:update', 'org'))
  async cancelRun(@Param('id') id: string, @ReqUser() user: any) {
    const orgId = user?.orgId ?? user?.organizationId ?? user?.organization_id;
    const { error } = await this.supabase.client
      .from('admin_pricing_recalc_runs')
      .update({ status: 'canceled' })
      .eq('id', id)
      .eq('org_id', orgId);
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return { canceled: true };
  }
}
