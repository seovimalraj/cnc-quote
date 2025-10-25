import { SpanStatusCode, trace } from '@opentelemetry/api';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  AdminPricingConfigSchema,
  ContractsV1,
  buildPromptPayload,
  buildResponsePayload,
  redactPromptText,
  computeAdminPricingProposalDigest,
  getModelConfig,
  renderAdminPricingRevisionSystemPrompt,
  renderAdminPricingRevisionUserPrompt,
} from '@cnc-quote/shared';
import type { PromptDescriptor as PromptDescriptorType } from '@cnc-quote/shared/dist/ai/prompt-registry';
import type {
  AdminPricingRevisionAssistantLLMResponseV1,
  AdminPricingRevisionAssistantAdjustmentV1,
  AdminPricingRevisionAssistantStatusV1,
} from '@cnc-quote/shared/dist/contracts/v1';
import { logger } from '../lib/logger';
import { incrementOllamaFailure, recordOllamaLatency } from '../lib/ollama-metrics';
import { getModelGatewayClient } from '../lib/model-gateway-client';

const ADJUSTABLE_ROOTS = new Set([
  'speed_region',
  'overhead_margin',
  'materials',
  'machines',
  'risk_matrix',
]);

interface RunRecord {
  id: string;
  status: AdminPricingRevisionAssistantStatusV1;
  instructions: string;
  focus_areas: string[] | null;
  base_version: string;
  base_config: unknown;
  trace_id?: string | null;
  org_id?: string | null;
}

type AdminPricingConfig = z.infer<typeof AdminPricingConfigSchema>;

export class AdminPricingRevisionAssistantService {
  private readonly tracer = trace.getTracer('worker.admin-pricing-revision');

  constructor(private readonly supabase: SupabaseClient) {}

  async execute(
    runId: string,
    context?: { traceId?: string | null; orgId?: string | null; requestedBy?: string | null },
  ): Promise<void> {
    const run = await this.loadRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const { baseConfig, baseVersion } = this.parseBaseConfig(run);

    await this.markProcessing(runId);

    try {
      const modelResult = await this.invokeModel({
        instructions: run.instructions,
        focusAreas: run.focus_areas ?? undefined,
        baseConfig,
        baseVersion,
        context,
      });
      const llmResponse = modelResult.response;

      const application = this.applyAdjustments(baseConfig, llmResponse.adjustments);

      const proposalConfig = {
        ...application.config,
        version: baseVersion,
      };

      const validated = AdminPricingConfigSchema.safeParse(proposalConfig);
      if (!validated.success) {
        throw new Error(`Generated proposal failed validation: ${validated.error.message}`);
      }

      const proposalDigest = computeAdminPricingProposalDigest(validated.data);

      const diffSummary = application.diffSummary;

      const completionTimestamp = new Date().toISOString();

      await this.supabase
        .from('admin_pricing_revision_runs')
        .update({
          status: 'succeeded',
          proposal_config: validated.data,
          adjustments: application.adjustments,
          diff_summary: diffSummary,
          notes: llmResponse.notes ?? null,
          completed_at: completionTimestamp,
          proposal_digest: proposalDigest,
          approval_state: 'pending',
          approval_required: true,
        })
        .eq('id', runId);
      await this.persistPromptAudit({
        runId,
        orgId: context?.orgId ?? run.org_id ?? null,
        requestedBy: context?.requestedBy ?? null,
        traceId: context?.traceId ?? run.trace_id ?? null,
        prompt: run,
        response: llmResponse,
        latencyMs: modelResult.latencyMs,
        systemPrompt: modelResult.systemPrompt,
        userPrompt: modelResult.userPrompt,
        baseConfig,
        focusAreas: run.focus_areas ?? undefined,
        modelVersion: modelResult.modelVersion,
        promptMetadata: modelResult.promptMetadata,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Unknown error';
      logger.error({ runId, message }, 'Failed to generate admin pricing revision proposal');
      await this.supabase
        .from('admin_pricing_revision_runs')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
          approval_required: false,
          approval_state: 'not_required',
        })
        .eq('id', runId);
      throw error;
    }
  }

  private async loadRun(runId: string): Promise<RunRecord | null> {
    const { data, error } = await this.supabase
      .from('admin_pricing_revision_runs')
      .select('id, status, instructions, focus_areas, base_version, base_config, trace_id, org_id')
      .eq('id', runId)
      .maybeSingle();

    if (error) {
      logger.error({ runId, error }, 'Failed to load revision assistant run');
      return null;
    }

    return (data as RunRecord | null) ?? null;
  }

  private parseBaseConfig(run: RunRecord): { baseConfig: AdminPricingConfig; baseVersion: string } {
    const parsed = AdminPricingConfigSchema.safeParse(run.base_config);
    if (!parsed.success) {
      throw new Error(`Stored base config invalid: ${parsed.error.message}`);
    }
    return { baseConfig: parsed.data, baseVersion: run.base_version };
  }

  private async markProcessing(runId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_pricing_revision_runs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', runId);

    if (error) {
      throw new Error(`Failed to mark run ${runId} as processing: ${error.message}`);
    }
  }

  private async persistPromptAudit(params: {
    runId: string;
    orgId: string | null;
    requestedBy?: string | null;
    traceId?: string | null;
    prompt: RunRecord;
    response: AdminPricingRevisionAssistantLLMResponseV1;
    latencyMs: number;
    systemPrompt: string;
    userPrompt: string;
    baseConfig: AdminPricingConfig;
    focusAreas?: string[];
    modelVersion: string;
    promptMetadata: {
      system: PromptDescriptorType<'admin-pricing-revision/system', unknown>;
      user: PromptDescriptorType<'admin-pricing-revision/user', unknown>;
    };
  }): Promise<void> {
    if (!params.orgId) {
      logger.warn({ runId: params.runId }, 'Skipping prompt audit persistence; orgId missing');
      return;
    }

    try {
      const userSummary = redactPromptText(params.userPrompt, 512);
      const systemSummary = redactPromptText(params.systemPrompt, 256);
      const responseSummary = redactPromptText(JSON.stringify(params.response.adjustments ?? []), 256);

      const promptPayload = buildPromptPayload({
        instructions: params.prompt.instructions,
        focusAreas: params.focusAreas ?? [],
        baseVersion: params.prompt.base_version,
        configSummary: {
          overhead_margin: params.baseConfig.overhead_margin,
          speed_region: params.baseConfig.speed_region,
          risk_matrix: params.baseConfig.risk_matrix,
        },
        systemPrompt: {
          preview: systemSummary.preview,
          digest: systemSummary.digest,
        },
        userPrompt: {
          preview: userSummary.preview,
          digest: userSummary.digest,
        },
        promptVersions: {
          system: params.promptMetadata.system.version,
          user: params.promptMetadata.user.version,
        },
      });

      const responsePayload = buildResponsePayload({
        notes: params.response.notes ?? null,
        adjustments: params.response.adjustments,
        targetVersion: params.response.targetVersion ?? null,
      });

      await this.supabase.from('admin_ai_prompts').insert({
        org_id: params.orgId,
        run_id: params.runId,
        trigger: 'admin-pricing-revision',
        model: params.modelVersion,
        prompt_preview: userSummary.preview,
        prompt_digest: userSummary.digest,
        prompt_payload: promptPayload,
        response_preview: responseSummary.preview,
        response_digest: responseSummary.digest,
        response_payload: responsePayload,
        latency_ms: Math.round(params.latencyMs),
        trace_id: params.traceId ?? null,
        requested_by: params.requestedBy ?? null,
      });
    } catch (error) {
      logger.warn({ runId: params.runId, error }, 'Failed to persist admin AI prompt audit row');
    }
  }

  private async invokeModel(input: {
    instructions: string;
    focusAreas?: string[];
    baseConfig: AdminPricingConfig;
    baseVersion: string;
    context?: { traceId?: string | null; orgId?: string | null };
  }): Promise<{
    response: AdminPricingRevisionAssistantLLMResponseV1;
    latencyMs: number;
    systemPrompt: string;
    userPrompt: string;
    modelVersion: string;
    promptMetadata: {
      system: PromptDescriptorType<'admin-pricing-revision/system', unknown>;
      user: PromptDescriptorType<'admin-pricing-revision/user', unknown>;
    };
  }> {
    const modelConfig = getModelConfig('admin-pricing-revision');
    const { prompt: systemPrompt, metadata: systemMetadata } = renderAdminPricingRevisionSystemPrompt();
    const { prompt: userPrompt, metadata: userMetadata } = renderAdminPricingRevisionUserPrompt({
      instructions: input.instructions,
      focusAreas: input.focusAreas,
      baseConfig: input.baseConfig,
      baseVersion: input.baseVersion,
    });
    const gateway = getModelGatewayClient();

    return this.tracer.startActiveSpan('ai.assistant.generate', async (span) => {
      const startedAt = Date.now();
      span.setAttribute('ai.model', modelConfig.deployment);
      span.setAttribute('ai.provider', 'ollama');
      if (input.context?.orgId) {
        span.setAttribute('ai.org_id', input.context.orgId);
      }
      if (input.context?.traceId) {
        span.setAttribute('ai.parent_trace_id', input.context.traceId);
      }

      try {
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
          input.context?.traceId ?? undefined,
        );

        const latencyMs = Date.now() - startedAt;
        recordOllamaLatency(latencyMs, {
          model: modelConfig.deployment,
          provider: 'ollama',
        });

        const content = response?.message?.content;
        if (typeof content !== 'string' || content.trim().length === 0) {
          throw new Error('Model returned empty response for pricing revision assistant run');
        }

        const parsed = this.parseModelResponse(content);
        const modelVersion = response?.model ?? modelConfig.deployment;
        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('ai.latency_ms', latencyMs);
        span.setAttribute('ai.response_size', content.length);

        return {
          response: parsed,
          latencyMs,
          systemPrompt,
          userPrompt,
          modelVersion,
          promptMetadata: {
            system: systemMetadata,
            user: userMetadata,
          },
        };
      } catch (error) {
        incrementOllamaFailure({ model: modelConfig.deployment, provider: 'ollama' });
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private parseModelResponse(raw: string): AdminPricingRevisionAssistantLLMResponseV1 {
    const normalized = raw
      .replace(/^```json/iu, '')
      .replace(/^```/u, '')
      .replace(/```$/u, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(normalized);
    } catch (error) {
      throw new Error(`Failed to parse model response JSON: ${(error as Error).message}`);
    }

    const result = ContractsV1.AdminPricingRevisionAssistantLLMResponseSchemaV1.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Model response failed schema validation: ${result.error.message}`);
    }

    return result.data;
  }

  private applyAdjustments(
    baseConfig: AdminPricingConfig,
    adjustments: AdminPricingRevisionAssistantAdjustmentV1[],
  ): {
  config: AdminPricingConfig;
    adjustments: AdminPricingRevisionAssistantAdjustmentV1[];
    diffSummary: string[];
  } {
  const clone = JSON.parse(JSON.stringify(baseConfig)) as AdminPricingConfig;
    const summaries: string[] = [];
    const enriched: AdminPricingRevisionAssistantAdjustmentV1[] = [];

    for (const adjustment of adjustments) {
      const segments = adjustment.path.split('.');
      if (!segments.length || !ADJUSTABLE_ROOTS.has(segments[0])) {
        throw new Error(`Unsupported adjustment path: ${adjustment.path}`);
      }

      const { beforeValue, apply, label } = this.resolveAccessor(clone, segments);
      const before = beforeValue();
      const after = this.computeNextValue(before, adjustment);
      apply(after);

  enriched.push({ ...adjustment, beforeValue: before ?? undefined, afterValue: after });
      summaries.push(`${label}: ${before ?? 'n/a'} → ${after} (${adjustment.reason})`);
    }

    return {
      config: clone,
      adjustments: enriched,
      diffSummary: summaries,
    };
  }

  private computeNextValue(current: number | null | undefined, adjustment: AdminPricingRevisionAssistantAdjustmentV1): number {
    const currentValue = typeof current === 'number' ? current : 0;
    switch (adjustment.type) {
      case 'set':
        return adjustment.value;
      case 'add':
        return currentValue + adjustment.value;
      case 'multiply':
        if (current === null || current === undefined) {
          throw new Error(`Cannot multiply undefined value for path ${adjustment.path}`);
        }
        return currentValue * adjustment.value;
      default:
        throw new Error(`Unsupported adjustment type ${(adjustment as any).type}`);
    }
  }

  private resolveAccessor(
    config: AdminPricingConfig,
    segments: string[],
  ): {
    beforeValue: () => number | null | undefined;
    apply: (value: number) => void;
    label: string;
  } {
    const [root, ...rest] = segments;
    switch (root) {
      case 'overhead_margin': {
        const field = rest[0];
        if (!['overhead_percent', 'target_margin_percent'].includes(field)) {
          throw new Error(`Unsupported overhead margin field ${field}`);
        }
        return {
          beforeValue: () => config.overhead_margin[field as 'overhead_percent' | 'target_margin_percent'],
          apply: (value) => {
            config.overhead_margin[field as 'overhead_percent' | 'target_margin_percent'] = value;
          },
          label: `overhead_margin.${field}`,
        };
      }
      case 'speed_region': {
        const [region, speed, field] = rest;
        const target = config.speed_region?.[region]?.[speed];
        if (!target || !['multiplier', 'leadtime_days'].includes(field)) {
          throw new Error(`Unsupported speed region adjustment ${segments.join('.')}`);
        }
        return {
          beforeValue: () => target[field as 'multiplier' | 'leadtime_days'],
          apply: (value) => {
            target[field as 'multiplier' | 'leadtime_days'] = value;
          },
          label: `speed_region.${region}.${speed}.${field}`,
        };
      }
      case 'materials': {
        const [materialKey, field] = rest;
        const material = config.materials?.[materialKey];
        if (!material || !['buy_price', 'waste_factor_percent', 'machinability'].includes(field)) {
          throw new Error(`Unsupported material adjustment ${segments.join('.')}`);
        }
        return {
          beforeValue: () => material[field as 'buy_price' | 'waste_factor_percent' | 'machinability'],
          apply: (value) => {
            material[field as 'buy_price' | 'waste_factor_percent' | 'machinability'] = value;
          },
          label: `materials.${materialKey}.${field}`,
        };
      }
      case 'machines': {
        const [machineKey, field] = rest;
        const machine = config.machines?.[machineKey];
        if (!machine || !['hourly_rate', 'setup_rate', 'min_setup_min'].includes(field)) {
          throw new Error(`Unsupported machine adjustment ${segments.join('.')}`);
        }
        return {
          beforeValue: () => machine[field as 'hourly_rate' | 'setup_rate' | 'min_setup_min'],
          apply: (value) => {
            machine[field as 'hourly_rate' | 'setup_rate' | 'min_setup_min'] = value;
          },
          label: `machines.${machineKey}.${field}`,
        };
      }
      case 'risk_matrix': {
        const [riskKey, field] = rest;
        const risk = config.risk_matrix?.[riskKey];
        if (!risk || !['risk_percent', 'risk_flat', 'time_multiplier'].includes(field)) {
          throw new Error(`Unsupported risk matrix adjustment ${segments.join('.')}`);
        }
        return {
          beforeValue: () => risk[field as 'risk_percent' | 'risk_flat' | 'time_multiplier'],
          apply: (value) => {
            risk[field as 'risk_percent' | 'risk_flat' | 'time_multiplier'] = value;
          },
          label: `risk_matrix.${riskKey}.${field}`,
        };
      }
      default:
        throw new Error(`Unsupported adjustment root ${root}`);
    }
  }
}
