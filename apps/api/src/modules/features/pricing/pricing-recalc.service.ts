import { Injectable, Logger } from '@nestjs/common';
import { context, trace } from '@opentelemetry/api';
import { randomUUID, createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { PricingEngineV2Service } from './pricing-engine-v2.service';
import { PricingPersistenceService } from './pricing-persistence.service';
import type { ContractsV1 } from '@cnc-quote/shared';
import { PRICING_RECALC_JOB } from './pricing-recalc.queue';
import { MetricsService } from "../../core/metrics/metrics.service";

type PricingRecalcJob = ContractsV1.PricingRecalcJobV1;

@Injectable()
export class PricingRecalcService {
  private readonly logger = new Logger(PricingRecalcService.name);
  private static readonly PAGE_SIZE = 100;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly engine: PricingEngineV2Service,
    private readonly persistence: PricingPersistenceService,
    private readonly metrics: MetricsService,
    @InjectQueue('pricing') private readonly pricingQueue: Queue,
  ) {}

  async enqueueRun(params: Omit<PricingRecalcJob, 'version' | 'traceId'> & { traceId?: string | null }): Promise<{ runId: string }> {
    const traceId = params.traceId ?? randomUUID();
    const scope = {
      materials: params.materials ?? null,
      processes: params.processes ?? null,
      machineGroups: params.machineGroups ?? null,
      createdFrom: params.createdFrom ?? null,
      createdTo: params.createdTo ?? null,
      targetQuoteIds: params.targetQuoteIds ?? null,
    };
    const scopeHash = createHash('sha1').update(JSON.stringify(scope)).digest('hex').slice(0, 12);

    // Persist run header
    const { data: runRows, error: runErr } = await this.supabase.client
      .from('admin_pricing_recalc_runs')
      .insert({
        org_id: params.orgId,
        reason: params.reason,
        requested_by: params.requestedBy ?? null,
        status: 'queued',
        dry_run: Boolean(params.dryRun),
        scope_json: scope,
      })
      .select('id')
      .limit(1);
    if (runErr) throw runErr;
    const runId = (runRows?.[0]?.id as string) ?? randomUUID();

    // Enqueue worker job with idempotent jobId
    const jobId = `recalc:${params.orgId ?? 'global'}:${scopeHash}`;
    await this.pricingQueue.add(
      PRICING_RECALC_JOB,
      { ...params, version: 1, traceId, runId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 25,
      },
    );

    return { runId };
  }

  async process(job: PricingRecalcJob): Promise<{ processed: number; succeeded: number; failed: number; skipped: number }> {
    const span = trace.getTracer('pricing').startSpan('pricing.recalc.run', {
      attributes: {
        'org.id': job.orgId ?? 'null',
        'pricing.recalc.reason': job.reason,
        'pricing.recalc.dry_run': Boolean(job.dryRun),
      },
    });
    return await context.with(trace.setSpan(context.active(), span), async () => {
      const runId = job.runId ?? null;
      const orgId = job.orgId;
      if (!orgId) {
        this.logger.warn('Recalc job missing orgId; aborting');
        span.end();
        return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
      }

      // Mark run started
      if (runId) {
        await this.supabase.client
          .from('admin_pricing_recalc_runs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', runId);
        // metrics: run started
        this.metrics.recalcRunsTotal.inc({
          org_id: orgId,
          status: 'running',
          reason: job.reason,
          dry_run: String(Boolean(job.dryRun)),
        });
      }

      let offset = 0;
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let skipped = 0;
      const pageSize = PricingRecalcService.PAGE_SIZE;
  // Circuit-breaker settings (last N attempted items, error rate > X triggers)
  const CB_WINDOW = Math.max(1, Number(process.env.PRICING_RECALC_CIRCUIT_WINDOW ?? 50));
  const CB_THRESHOLD = Math.min(0.95, Math.max(0.05, Number(process.env.PRICING_RECALC_CIRCUIT_THRESHOLD ?? 0.5)));
  const attemptWindow: number[] = []; // 1=failure, 0=success (skips excluded)

      // Page through eligible quote items for the org
      while (true) {
        const items = await this.fetchEligibleItems({ orgId, job, offset, limit: pageSize });
        if (items.length === 0) break;

        for (const item of items) {
          // Early cancel check
          if (runId) {
            const canceled = await this.isCanceled(runId);
            if (canceled) {
              await this.supabase.client
                .from('admin_pricing_recalc_runs')
                .update({ status: 'canceled', finished_at: new Date().toISOString() })
                .eq('id', runId);
              span.end();
              return { processed, succeeded, failed, skipped };
            }
          }

          processed++;
          const itemStart = Date.now();
          const itemId = item.id as string;
          const quoteId = item.quote_id as string;
          const partConfig = item.config_json as ContractsV1.PartConfigV1 | null;

          // Skip if no config
          if (!partConfig) {
            skipped++;
            await this.recordItem(runId, orgId, quoteId, itemId, 'skipped', null, 'missing_part_config');
            continue;
          }

          // Idempotent skip if already succeeded for this run
          if (runId) {
            const { data: existing, error: existingErr } = await this.supabase.client
              .from('admin_pricing_recalc_items')
              .select('id')
              .eq('run_id', runId)
              .eq('quote_item_id', itemId)
              .eq('status', 'succeeded')
              .limit(1);
            if (!existingErr && (existing?.length ?? 0) > 0) {
              skipped++;
              continue;
            }
          }

          try {
            const qty = typeof (partConfig as any).selected_quantity === 'number' && (partConfig as any).selected_quantity > 0
              ? (partConfig as any).selected_quantity
              : 1;

            const response = await this.engine.calculatePricing({
              part_config: partConfig,
              geometry: undefined,
              quantities: [qty],
              calculateTax: false,
            });

            const matrix = response.pricing_matrix.map((row) => ({
              quantity: row.quantity,
              unit_price: row.unit_price,
              total_price: row.total_price,
              cost_factors: row.cost_factors,
              margin_percentage: row.margin_percentage,
              breakdown: row.breakdown,
            }));

            if (!job.dryRun) {
              await this.persistence.persistMatrixAndTotals({
                quote_id: quoteId,
                quote_item_id: itemId,
                matrix,
                partConfig,
                traceId: job.traceId,
              });
            }

            const elapsedMs = Date.now() - itemStart;
            span.addEvent('pricing.recalc.item.succeeded', {
              'quote.id': quoteId,
              'quote_item.id': itemId,
              'elapsed.ms': elapsedMs,
            });
            this.logger.debug(`repriced item=${itemId} quote=${quoteId} in ${elapsedMs}ms`);
            succeeded++;
            await this.recordItem(runId, orgId, quoteId, itemId, 'succeeded');
            // circuit-breaker window update (attempted)
            attemptWindow.push(0);
            if (attemptWindow.length > CB_WINDOW) attemptWindow.shift();
            // metrics: item success
            this.metrics.recalcItemsTotal.inc({ org_id: orgId, outcome: 'succeeded', reason: job.reason, dry_run: String(Boolean(job.dryRun)) });
            this.metrics.recalcItemDurationMs.observe({ org_id: orgId, outcome: 'succeeded' }, elapsedMs);
          } catch (error) {
            failed++;
            span.addEvent('pricing.recalc.item.failed', {
              'quote.id': quoteId,
              'quote_item.id': itemId,
              'error.message': (error as Error)?.message ?? 'error',
            });
            await this.recordItem(runId, orgId, quoteId, itemId, 'failed', null, (error as Error)?.message ?? 'error');
            // circuit-breaker window update (attempted)
            attemptWindow.push(1);
            if (attemptWindow.length > CB_WINDOW) attemptWindow.shift();
            // metrics: item failure
            this.metrics.recalcItemsTotal.inc({ org_id: orgId, outcome: 'failed', reason: job.reason, dry_run: String(Boolean(job.dryRun)) });
            this.metrics.recalcItemDurationMs.observe({ org_id: orgId, outcome: 'failed' }, Date.now() - itemStart);
          }

          // Circuit-breaker: evaluate after each attempt (exclude skipped)
          const attemptsConsidered = attemptWindow.length;
          if (attemptsConsidered >= CB_WINDOW) {
            const failuresInWindow = attemptWindow.reduce((a, b) => a + b, 0);
            const errorRate = failuresInWindow / attemptsConsidered;
            if (errorRate >= CB_THRESHOLD) {
              const status = failed > 0 && succeeded > 0 ? 'partial' : 'failed';
              span.addEvent('pricing.recalc.circuit_tripped', {
                'window.size': CB_WINDOW,
                'window.failures': failuresInWindow,
                'window.error_rate': errorRate,
              });
              this.logger.warn(
                `Circuit-breaker tripped (window=${CB_WINDOW}, failures=${failuresInWindow}, rate=${(errorRate * 100).toFixed(1)}%). Early stop.`,
              );
              if (runId) {
                await this.supabase.client
                  .from('admin_pricing_recalc_runs')
                  .update({
                    status,
                    total_count: processed,
                    success_count: succeeded,
                    failed_count: failed,
                    skipped_count: skipped,
                    error: 'circuit_breaker_tripped',
                    finished_at: new Date().toISOString(),
                  })
                  .eq('id', runId);
                // metrics: run finished via circuit
                this.metrics.recalcRunsTotal.inc({
                  org_id: orgId,
                  status,
                  reason: job.reason,
                  dry_run: String(Boolean(job.dryRun)),
                });
                if (this.metrics as any && (this.metrics as any).recalcCircuitTrippedTotal) {
                  (this.metrics as any).recalcCircuitTrippedTotal.inc({ org_id: orgId });
                }
              }
              span.setAttributes({
                'pricing.recalc.processed': processed,
                'pricing.recalc.succeeded': succeeded,
                'pricing.recalc.failed': failed,
                'pricing.recalc.skipped': skipped,
                'pricing.recalc.circuit_tripped': true,
              });
              span.end();
              return { processed, succeeded, failed, skipped };
            }
          }
        }

        offset += items.length;
      }

      if (runId) {
        await this.supabase.client
          .from('admin_pricing_recalc_runs')
          .update({
            status: failed > 0 && succeeded > 0 ? 'partial' : failed > 0 ? 'failed' : 'succeeded',
            total_count: processed,
            success_count: succeeded,
            failed_count: failed,
            skipped_count: skipped,
            finished_at: new Date().toISOString(),
          })
          .eq('id', runId);
        // metrics: run finished
        const finalStatus = failed > 0 && succeeded > 0 ? 'partial' : failed > 0 ? 'failed' : 'succeeded';
        this.metrics.recalcRunsTotal.inc({
          org_id: orgId,
          status: finalStatus,
          reason: job.reason,
          dry_run: String(Boolean(job.dryRun)),
        });
      }

      span.setAttributes({
        'pricing.recalc.processed': processed,
        'pricing.recalc.succeeded': succeeded,
        'pricing.recalc.failed': failed,
        'pricing.recalc.skipped': skipped,
      });
      span.end();
      return { processed, succeeded, failed, skipped };
    });
  }

  private async fetchEligibleItems(params: {
    orgId: string;
    job: PricingRecalcJob;
    offset: number;
    limit: number;
  }): Promise<Array<{ id: string; quote_id: string; config_json: any; created_at?: string }>> {
    const { orgId, job, offset, limit } = params;
    let query = this.supabase.client
      .from('quote_items')
      .select('id, quote_id, config_json, created_at, quotes!inner(org_id)')
      .eq('quotes.org_id', orgId);

    if (Array.isArray(job.targetQuoteIds) && job.targetQuoteIds.length > 0) {
      query = query.in('quote_id', job.targetQuoteIds);
    }

    if (job.materials && job.materials.length > 0) {
      query = query.or(
        job.materials
          .map((code) => `config_json->>material_id.eq.${code}`)
          .join(',')
      );
    }

    if (job.processes && job.processes.length > 0) {
      query = query.or(
        job.processes
          .map((p) => `config_json->>process_type.eq.${p}`)
          .join(',')
      );
    }

    if (job.createdFrom) {
      query = query.gte('created_at', job.createdFrom);
    }
    if (job.createdTo) {
      query = query.lte('created_at', job.createdTo);
    }

    query = query.order('created_at', { ascending: true }).range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) {
      this.logger.warn(`fetchEligibleItems failed: ${error.message}`);
      return [];
    }
    return (data as any[]) || [];
  }

  private async isCanceled(runId: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('admin_pricing_recalc_runs')
      .select('status')
      .eq('id', runId)
      .maybeSingle();
    if (error) return false;
    const status = (data as any)?.status as string | undefined;
    return status === 'canceled';
  }

  private async recordItem(
    runId: string | null,
    orgId: string,
    quoteId: string,
    quoteItemId: string,
    status: 'succeeded' | 'failed' | 'skipped',
    deltaTotal?: number | null,
    error?: string | null,
  ): Promise<void> {
    if (!runId) return;
    await this.supabase.client
      .from('admin_pricing_recalc_items')
      .insert({
        run_id: runId,
        org_id: orgId,
        quote_id: quoteId,
        quote_item_id: quoteItemId,
        status,
        delta_total: deltaTotal ?? null,
        error: error ?? null,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });
  }
}
