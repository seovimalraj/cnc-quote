import axios from 'axios';
import Redis from 'ioredis';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ContractsV1, buildQuoteRationaleCacheKeyV1, buildQuoteRationaleRevisionCacheKeyV1, QUOTE_RATIONALE_CACHE_TTL_SECONDS } from '@cnc-quote/shared';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const highlightSchema = z.object({
  category: z.enum([
    'material',
    'machining',
    'setup',
    'finish',
    'inspection',
    'overhead',
    'margin',
    'lead_time',
    'logistics',
    'surcharge',
    'discount',
    'other',
  ]),
  description: z.string().min(1),
  amountImpact: z.union([z.number(), z.string(), z.null()]).optional(),
  percentImpact: z.union([z.number(), z.string(), z.null()]).optional(),
});

const responseSchema = z.object({
  summaryText: z.string().min(10),
  breakdownHighlights: z.array(highlightSchema).max(6),
});

export interface PricingRationalePersistenceResult {
  summary: ContractsV1.QuoteRationaleSummaryV1;
}

export class PricingRationaleService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly redis: Redis,
  ) {}

  async generateAndPersist(payload: ContractsV1.PricingRationaleSummaryJobV1): Promise<PricingRationalePersistenceResult> {
    if (!payload.orgId) {
      throw new Error('Pricing rationale job missing orgId');
    }

    const { content, modelVersion } = await this.generateSummary(payload);
    const validated = this.parseModelResponse(content);

    const summary: ContractsV1.QuoteRationaleSummaryV1 = {
      quoteId: payload.quoteId,
      quoteRevisionId: payload.quoteRevisionId ?? null,
      summaryText: validated.summaryText.trim(),
      breakdownHighlights: validated.breakdownHighlights.map((item) => ({
        category: item.category,
        description: item.description.trim(),
        amountImpact: this.toNullableNumber(item.amountImpact),
        percentImpact: this.toNullableNumber(item.percentImpact),
      })),
      modelVersion,
      generatedAt: new Date().toISOString(),
      traceId: payload.traceId ?? null,
      costSheetHash: payload.costSheetHash,
    };

    await this.persistSummary({ payload, summary });
    await this.writeThroughCache({ payload, summary });

    logger.info(
      {
        quoteId: payload.quoteId,
        quoteRevisionId: payload.quoteRevisionId ?? null,
        costSheetHash: payload.costSheetHash,
        highlightCount: summary.breakdownHighlights.length,
        modelVersion: summary.modelVersion,
      },
      'Persisted pricing rationale summary',
    );

    return { summary };
  }

  private async generateSummary(payload: ContractsV1.PricingRationaleSummaryJobV1): Promise<{ content: string; modelVersion: string }> {
    const prompt = this.buildPrompt(payload.costSheet);
    const systemPrompt = this.buildSystemPrompt(payload);

    const response = await axios.post(
      `${config.ollamaHost}/api/chat`,
      {
        model: config.ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream: false,
        options: {
          temperature: 0,
          top_p: 0.9,
        },
      },
      {
        timeout: config.ollamaTimeoutMs,
      },
    );

    const content = response.data?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Model returned empty response for pricing rationale summary');
    }

    return { content: content.trim(), modelVersion: response.data?.model ?? config.ollamaModel };
  }

  private parseModelResponse(raw: string): z.infer<typeof responseSchema> {
    const normalized = raw.replace(/^```json/iu, '').replace(/^```/u, '').replace(/```$/u, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(normalized);
    } catch (error) {
      throw new Error(`Failed to parse model response JSON: ${(error as Error).message}`);
    }

    const result = responseSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Model response failed schema validation: ${result.error.message}`);
    }

    return result.data;
  }

  private async persistSummary(args: {
    payload: ContractsV1.PricingRationaleSummaryJobV1;
    summary: ContractsV1.QuoteRationaleSummaryV1;
  }): Promise<void> {
    const { payload, summary } = args;

    const { error } = await this.supabase
      .from('quote_rationale_summaries')
      .upsert(
        {
          quote_id: payload.quoteId,
          quote_revision_id: payload.quoteRevisionId,
          org_id: payload.orgId,
          pricing_version: payload.pricingVersion,
          cost_sheet_hash: payload.costSheetHash,
          cost_sheet: payload.costSheet,
          summary_text: summary.summaryText,
          breakdown_highlights: summary.breakdownHighlights,
          model_version: summary.modelVersion,
          trace_id: summary.traceId,
          feature_flag_key: payload.featureFlagKey,
          generated_at: summary.generatedAt,
        },
        { onConflict: 'quote_id,cost_sheet_hash' },
      );

    if (error) {
      throw new Error(`Failed to persist quote_rationale_summaries: ${error.message}`);
    }
  }

  private async writeThroughCache(args: {
    payload: ContractsV1.PricingRationaleSummaryJobV1;
    summary: ContractsV1.QuoteRationaleSummaryV1;
  }): Promise<void> {
    const { payload, summary } = args;
    const cachePayload: ContractsV1.QuoteRationaleCachePayloadV1 = {
      summary,
      costSheet: payload.costSheet,
    };

    const primaryKey = buildQuoteRationaleCacheKeyV1(payload.quoteId);
    await this.redis.set(primaryKey, JSON.stringify(cachePayload), 'EX', QUOTE_RATIONALE_CACHE_TTL_SECONDS);

    if (summary.quoteRevisionId) {
      const revisionKey = buildQuoteRationaleRevisionCacheKeyV1(summary.quoteRevisionId);
      await this.redis.set(revisionKey, JSON.stringify(cachePayload), 'EX', QUOTE_RATIONALE_CACHE_TTL_SECONDS);
    }
  }

  private buildPrompt(costSheet: ContractsV1.QuoteRationaleCostSheetV1): string {
    const lines: string[] = [
      `Quote ${costSheet.quoteId} priced in ${costSheet.currency}`,
      `Subtotal: ${this.formatCurrency(costSheet.subtotal)} (pricing version ${costSheet.pricingVersion})`,
    ];

    costSheet.items.slice(0, 6).forEach((item, index) => {
      lines.push(
        [
          `Item ${index + 1}: quantity ${item.quantity}, unit ${this.formatCurrency(item.unitPrice)}, total ${this.formatCurrency(item.totalPrice)}`,
          item.leadTimeDays ? `lead time ${this.formatNumber(item.leadTimeDays)} days` : null,
          item.breakdown
            ? `breakdown: ${Object.entries(item.breakdown)
                .map(([key, value]) => `${key}=${this.formatNumber(value)}`)
                .join(', ')}`
            : null,
          item.compliance?.flags?.length
            ? `compliance alerts: ${item.compliance.flags.map((flag) => `${flag.code}:${flag.severity}`).join(', ')}`
            : null,
        ]
          .filter(Boolean)
          .join(' | '),
      );
    });

    return lines.join('\n');
  }

  private buildSystemPrompt(payload: ContractsV1.PricingRationaleSummaryJobV1): string {
  return `You are a deterministic CNC pricing analyst.
Summarize pricing outcomes for pricing teams.
Rules:
- Respond in strict JSON with keys summaryText and breakdownHighlights.
- Use at most six highlights. Each highlight must include category (material|machining|setup|finish|inspection|overhead|margin|lead_time|logistics|surcharge|discount|other) and a concise description.
- Provide numeric amountImpact (USD) or null. Provide percentImpact (percentage difference) or null.
- Emphasize drivers affecting subtotal ${this.formatCurrency(payload.costSheet.subtotal)} in ${payload.costSheet.currency} using deterministic facts only.
- Never suggest altering totals directly; label opportunities or risks only.`;
  }

  private formatCurrency(value: unknown): string {
    const numeric = this.toNullableNumber(value) ?? 0;
    return numeric.toFixed(2);
  }

  private formatNumber(value: unknown): string {
    const numeric = this.toNullableNumber(value);
    return numeric === null ? 'n/a' : numeric.toString();
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
}
