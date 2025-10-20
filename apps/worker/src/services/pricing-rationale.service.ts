import Redis from 'ioredis';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  ContractsV1,
  buildQuoteRationaleCacheKeyV1,
  buildQuoteRationaleRevisionCacheKeyV1,
  getModelConfig,
  renderPricingRationaleSystemPrompt,
  renderPricingRationaleUserPrompt,
  QUOTE_RATIONALE_CACHE_TTL_SECONDS,
} from '@cnc-quote/shared';
import { getModelGatewayClient } from '../lib/model-gateway-client.js';
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
    const modelConfig = getModelConfig('pricing-rationale');
    const { prompt: userPrompt, metadata: userMetadata } = renderPricingRationaleUserPrompt(payload.costSheet);
    const { prompt: systemPrompt, metadata: systemMetadata } = renderPricingRationaleSystemPrompt(payload);

    const gateway = getModelGatewayClient();
    const response = await gateway.chat<any>(
      {
        model: modelConfig.deployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: {
          temperature: 0,
          top_p: 0.9,
        },
        metadata: {
          systemPromptVersion: systemMetadata.version,
          userPromptVersion: userMetadata.version,
        },
      },
      payload.traceId,
    );

    const content = response?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Model returned empty response for pricing rationale summary');
    }

    const modelVersion = response?.model ?? modelConfig.deployment;
    logger.debug(
      {
        quoteId: payload.quoteId,
        modelVersion,
        systemPromptVersion: systemMetadata.version,
        userPromptVersion: userMetadata.version,
      },
      'Generated pricing rationale summary via model gateway',
    );

    return { content: content.trim(), modelVersion };
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
