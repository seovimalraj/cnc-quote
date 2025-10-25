import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { ContractsV1, QUOTE_RATIONALE_CACHE_TTL_SECONDS, buildQuoteRationaleCacheKeyV1, buildQuoteRationaleRevisionCacheKeyV1 } from '@cnc-quote/shared';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { AdminFeatureFlagsService } from "../admin/admin/admin-feature-flags/admin-feature-flags.service";
import { CacheService } from "../../../lib/cache/cache.service";
import {
  PRICING_RATIONALE_JOB,
  PRICING_RATIONALE_QUEUE,
  PricingRationaleSummaryJob,
} from './pricing-rationale.queue';

const FEATURE_FLAG_KEY = 'pricing_quote_rationale';
const CACHE_TTL_SECONDS = QUOTE_RATIONALE_CACHE_TTL_SECONDS;

interface QuoteItemPricingRow {
  id: string;
  pricing_matrix: unknown;
  config_json?: unknown;
}

interface ScheduleSummaryParams {
  quoteId: string;
  pricingVersion: number;
  subtotal: number;
  traceId: string;
  items: QuoteItemPricingRow[];
}

@Injectable()
export class PricingRationaleSummaryService {
  private readonly logger = new Logger(PricingRationaleSummaryService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly featureFlags: AdminFeatureFlagsService,
    private readonly cache: CacheService,
    @InjectQueue(PRICING_RATIONALE_QUEUE)
    private readonly queue: Queue<PricingRationaleSummaryJob>,
  ) {}

  async scheduleSummary(params: ScheduleSummaryParams): Promise<void> {
    if (!params.items || params.items.length === 0) {
      this.logger.debug(`Skipping rationale summary enqueue for quote=${params.quoteId}; no pricing rows available`);
      return;
    }

    const { data: quoteRow, error: quoteError } = await this.supabase.client
      .from('quotes')
      .select('id, org_id, currency')
      .eq('id', params.quoteId)
      .maybeSingle();

    if (quoteError) {
      this.logger.warn(
        `Unable to load quote context for rationale summary (quote=${params.quoteId}): ${quoteError.message}`,
      );
      return;
    }

    if (!quoteRow) {
      this.logger.warn(`Quote not found when scheduling rationale summary (quote=${params.quoteId})`);
      return;
    }

    const orgId = quoteRow.org_id as string | null;
    if (!orgId) {
      this.logger.debug(
        `Skipping rationale summary enqueue for quote=${params.quoteId}; missing org context`,
      );
      return;
    }
    const feature = await this.featureFlags.evaluateFeatureFlag(FEATURE_FLAG_KEY, {
      organization_id: orgId,
    });

    if (!feature.enabled) {
      this.logger.debug(
        `Rationale summary flag disabled for quote=${params.quoteId} (org=${orgId ?? 'n/a'})`,
      );
      return;
    }

    const costSheet = this.buildCostSheet({
      quoteId: params.quoteId,
      pricingVersion: params.pricingVersion,
      subtotal: params.subtotal,
      currency: typeof quoteRow.currency === 'string' && quoteRow.currency.length > 0 ? quoteRow.currency : 'USD',
      items: params.items,
    });
    const costSheetHash = this.computeCostSheetHash(costSheet);

    const existing = await this.fetchLatestSummaryRow({
      quoteId: params.quoteId,
      orgId,
      costSheetHash,
    });
    const cacheKey = buildQuoteRationaleCacheKeyV1(params.quoteId);

    if (existing) {
      const payload = this.rowToCachePayload(existing);
      await this.cache.set(cacheKey, payload, CACHE_TTL_SECONDS);
      if (existing.quote_revision_id && payload.summary.quoteRevisionId) {
        const revisionCacheKey = buildQuoteRationaleRevisionCacheKeyV1(payload.summary.quoteRevisionId);
        await this.cache.set(revisionCacheKey, payload, CACHE_TTL_SECONDS);
      }
      this.logger.debug(
        `Skipping rationale summary enqueue for quote=${params.quoteId}; existing summary matches hash=${costSheetHash}`,
      );
      return;
    }

    await this.cache.del(cacheKey);

    const { data: revisionRow, error: revisionError } = await this.supabase.client
      .from('quote_revisions')
      .select('id')
      .eq('quote_id', params.quoteId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (revisionError) {
      this.logger.warn(
        `Failed to resolve latest revision for quote=${params.quoteId}: ${revisionError.message}`,
      );
    }

    const revisionCacheKey = revisionRow?.id
      ? buildQuoteRationaleRevisionCacheKeyV1(revisionRow.id)
      : null;

    if (revisionCacheKey) {
      await this.cache.del(revisionCacheKey);
    }

    await this.queue.add(
      PRICING_RATIONALE_JOB,
      {
        version: 1,
        quoteId: params.quoteId,
        quoteRevisionId: revisionRow?.id ?? null,
        orgId,
        traceId: params.traceId,
        pricingVersion: params.pricingVersion,
        featureFlagKey: FEATURE_FLAG_KEY,
        costSheetHash,
        costSheet,
      },
      {
        jobId: `${PRICING_RATIONALE_QUEUE}:${params.quoteId}:${params.pricingVersion}`,
        removeOnComplete: true,
        removeOnFail: 25,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.debug(
      `Queued pricing rationale summary for quote=${params.quoteId} hash=${costSheetHash}`,
    );
  }

  async getSummary(params: { quoteId: string; orgId: string }): Promise<ContractsV1.QuoteRationaleCachePayloadV1 | null> {
  const cacheKey = buildQuoteRationaleCacheKeyV1(params.quoteId);
    const cached = await this.cache.get<ContractsV1.QuoteRationaleCachePayloadV1>(cacheKey);
    if (cached) {
      return cached;
    }

    const row = await this.fetchLatestSummaryRow({ quoteId: params.quoteId, orgId: params.orgId });
    if (!row) {
      return null;
    }

    const payload = this.rowToCachePayload(row);
    await this.cache.set(cacheKey, payload, CACHE_TTL_SECONDS);
    if (payload.summary.quoteRevisionId) {
      const revisionCacheKey = buildQuoteRationaleRevisionCacheKeyV1(payload.summary.quoteRevisionId);
      await this.cache.set(revisionCacheKey, payload, CACHE_TTL_SECONDS);
    }
    return payload;
  }

  private buildCostSheet(input: {
    quoteId: string;
    pricingVersion: number;
    subtotal: number;
    currency: string;
    items: QuoteItemPricingRow[];
  }): ContractsV1.QuoteRationaleCostSheetV1 {
    const items: ContractsV1.QuoteRationaleCostSheetItemV1[] = [];

    for (const row of input.items) {
      const matrix = Array.isArray(row.pricing_matrix) ? row.pricing_matrix : [];
      const config = (row.config_json ?? {}) as Record<string, unknown>;
      const selectedQuantity = typeof config?.selected_quantity === 'number' ? (config.selected_quantity as number) : undefined;

      let selected: any = matrix.find((entry: any) => selectedQuantity !== undefined && entry?.quantity === selectedQuantity);
      if (!selected) {
        selected = matrix.find((entry: any) => typeof entry?.total_price === 'number') ?? matrix[0] ?? null;
      }

      const quantity = this.toNumber(selected?.quantity, selectedQuantity ?? 0);
      const unitPrice = this.toNumber(selected?.unit_price);
      const totalPrice = this.toNumber(selected?.total_price, quantity * unitPrice);
      const leadTimeDays = this.toNullableNumber(selected?.lead_time_days);
      const breakdown = this.toPricingBreakdown(selected?.breakdown);
      const compliance = this.toComplianceSnapshot(selected?.compliance);

      items.push({
        quoteItemId: row.id,
        quantity,
        unitPrice,
        totalPrice,
        leadTimeDays,
        breakdown,
        compliance,
      });
    }

    return {
      quoteId: input.quoteId,
      pricingVersion: input.pricingVersion,
      currency: input.currency,
      subtotal: input.subtotal,
      total: input.subtotal,
      items,
    };
  }

  private computeCostSheetHash(costSheet: ContractsV1.QuoteRationaleCostSheetV1): string {
    const digest = JSON.stringify(costSheet);
    return createHash('sha256').update(digest).digest('hex');
  }

  private async fetchLatestSummaryRow(params: {
    quoteId: string;
    orgId: string | null;
    costSheetHash?: string;
  }): Promise<any | null> {
    if (!params.orgId) {
      return null;
    }

    let query = this.supabase.client
      .from('quote_rationale_summaries')
      .select(
        'quote_id, quote_revision_id, org_id, summary_text, breakdown_highlights, model_version, trace_id, cost_sheet, cost_sheet_hash, generated_at'
      )
      .eq('quote_id', params.quoteId)
      .eq('org_id', params.orgId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (params.costSheetHash) {
      query = query.eq('cost_sheet_hash', params.costSheetHash);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      this.logger.warn(
        `Failed to fetch rationale summary for quote=${params.quoteId}: ${error.message}`,
      );
      return null;
    }
    return data ?? null;
  }

  private rowToCachePayload(row: any): ContractsV1.QuoteRationaleCachePayloadV1 {
    const summary: ContractsV1.QuoteRationaleSummaryV1 = {
      quoteId: row.quote_id,
      quoteRevisionId: row.quote_revision_id ?? null,
      summaryText: String(row.summary_text ?? ''),
      breakdownHighlights: Array.isArray(row.breakdown_highlights)
        ? (row.breakdown_highlights as ContractsV1.QuoteRationaleBreakdownHighlightV1[])
        : [],
      modelVersion: String(row.model_version ?? ''),
      generatedAt: new Date(row.generated_at ?? Date.now()).toISOString(),
      traceId: row.trace_id ?? null,
      costSheetHash: String(row.cost_sheet_hash ?? ''),
    };

    const costSheet = (row.cost_sheet ?? {
      quoteId: row.quote_id,
      pricingVersion: 0,
      currency: 'USD',
      subtotal: 0,
      total: 0,
      items: [],
    }) as ContractsV1.QuoteRationaleCostSheetV1;

    return { summary, costSheet };
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private toNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  private toPricingBreakdown(value: unknown): ContractsV1.PricingBreakdownV1 | null {
    if (value && typeof value === 'object') {
      return value as ContractsV1.PricingBreakdownV1;
    }
    return null;
  }

  private toComplianceSnapshot(value: unknown): ContractsV1.QuoteComplianceSnapshotV1 | null {
    if (value && typeof value === 'object') {
      return value as ContractsV1.QuoteComplianceSnapshotV1;
    }
    return null;
  }
}
