/**
 * Process Recommender Service (Step 10)
 * Rule-driven process recommendation engine
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase/supabase.service';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { RULES } from './rules/rules';
import {
  RecommendRequest,
  ProcessRecommendationResponse,
  ProcessRecommendation,
  RecommendCtx,
  GeometryFeatures,
  QuoteConfig,
  ProcessType,
} from './types';

interface ScoreMap {
  geometry_fit: number;
  feature_match: number;
  constraint_penalty: number;
  user_intent_bonus: number;
}

const THRESHOLDS = {
  recommendation_emit_min_confidence: 0.25,
  top_pick_min_delta: 0.08,
};

const WEIGHTS: Record<ProcessType, Record<keyof ScoreMap, number>> = {
  cnc_milling: { geometry_fit: 0.45, feature_match: 0.35, user_intent_bonus: 0.2, constraint_penalty: 1 },
  turning: { geometry_fit: 0.5, feature_match: 0.35, user_intent_bonus: 0.15, constraint_penalty: 1 },
  sheet_metal: { geometry_fit: 0.6, feature_match: 0.3, user_intent_bonus: 0.1, constraint_penalty: 1 },
  injection_molding: { geometry_fit: 0.4, feature_match: 0.3, user_intent_bonus: 0.3, constraint_penalty: 1 },
  additive: { geometry_fit: 0.45, feature_match: 0.35, user_intent_bonus: 0.2, constraint_penalty: 1 },
};

@Injectable()
export class RecommenderService {
  private readonly logger = new Logger(RecommenderService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly analytics: AnalyticsService,
  ) {}

  async recommendProcesses(
    request: RecommendRequest,
    orgId: string,
    traceId?: string,
  ): Promise<ProcessRecommendationResponse> {
    const start = Date.now();

    // Fetch geometry features and quote config
    const features = await this.fetchGeometryFeatures(request.part_id, orgId);
    const config = await this.fetchQuoteConfig(request.quote_id, orgId);

    // Apply overrides
    if (request.override) {
      if (request.override.material_code) config.material_code = request.override.material_code;
      if (request.override.quantity) config.quantity = request.override.quantity;
      if (request.override.requested_process) config.requested_process = request.override.requested_process;
    }

    const ctx: RecommendCtx = { features, config };

    // Initialize scores
    const scores: Record<ProcessType, ScoreMap> = {
      cnc_milling: { geometry_fit: 0, feature_match: 0, constraint_penalty: 0, user_intent_bonus: 0 },
      turning: { geometry_fit: 0, feature_match: 0, constraint_penalty: 0, user_intent_bonus: 0 },
      sheet_metal: { geometry_fit: 0, feature_match: 0, constraint_penalty: 0, user_intent_bonus: 0 },
      injection_molding: { geometry_fit: 0, feature_match: 0, constraint_penalty: 0, user_intent_bonus: 0 },
      additive: { geometry_fit: 0, feature_match: 0, constraint_penalty: 0, user_intent_bonus: 0 },
    };

    const reasons: Record<ProcessType, string[]> = {
      cnc_milling: [],
      turning: [],
      sheet_metal: [],
      injection_molding: [],
      additive: [],
    };

    const fired: Record<ProcessType, string[]> = {
      cnc_milling: [],
      turning: [],
      sheet_metal: [],
      injection_molding: [],
      additive: [],
    };

    const blockingConstraints: Record<ProcessType, string[]> = {
      cnc_milling: [],
      turning: [],
      sheet_metal: [],
      injection_molding: [],
      additive: [],
    };

    // Execute rules
    for (const rule of RULES) {
      try {
        if (rule.if(ctx)) {
          const p = rule.then.process;
          if (rule.then.geometry_fit) scores[p].geometry_fit += rule.then.geometry_fit;
          if (rule.then.feature_match) scores[p].feature_match += rule.then.feature_match;
          if (rule.then.user_intent_bonus) scores[p].user_intent_bonus += rule.then.user_intent_bonus;
          if (rule.then.constraint_penalty) scores[p].constraint_penalty += rule.then.constraint_penalty;
          if (rule.then.reasons) reasons[p].push(...rule.then.reasons);
          if (rule.then.blocking_constraints) blockingConstraints[p].push(...rule.then.blocking_constraints);
          fired[p].push(rule.id);
        }
      } catch (error) {
        this.logger.warn(`Rule ${rule.id} evaluation error: ${(error as Error)?.message}`);
      }
    }

    // Calculate final confidence scores
    const recommendations: ProcessRecommendation[] = (Object.keys(scores) as ProcessType[])
      .map((process) => {
        const s = scores[process];
        const w = WEIGHTS[process];
        const total =
          s.geometry_fit * w.geometry_fit +
          s.feature_match * w.feature_match +
          s.user_intent_bonus * w.user_intent_bonus -
          s.constraint_penalty * w.constraint_penalty;
        const confidence = Math.max(0, Math.min(1, total));

        return {
          process,
          confidence: Number(confidence.toFixed(3)),
          reasons: Array.from(new Set(reasons[process])).slice(0, 5),
          decision_vector: {
            rules_fired: fired[process],
            scores: {
              geometry_fit: Number(s.geometry_fit.toFixed(3)),
              feature_match: Number(s.feature_match.toFixed(3)),
              constraint_penalty: Number(s.constraint_penalty.toFixed(3)),
              user_intent_bonus: Number(s.user_intent_bonus.toFixed(3)),
            },
          },
          blocking_constraints: Array.from(new Set(blockingConstraints[process])),
          metadata: {},
        };
      })
      .filter((r) => r.confidence >= THRESHOLDS.recommendation_emit_min_confidence)
      .sort((a, b) => b.confidence - a.confidence);

    const elapsed = Date.now() - start;
    const generated_at = new Date().toISOString();

    const response: ProcessRecommendationResponse = {
      recommendations,
      version: 'v0.1',
      generated_at,
    };

    // Emit telemetry
    await this.emitTelemetry({
      event: 'PROC_REC_RETURNED',
      orgId,
      quoteId: request.quote_id,
      partId: request.part_id,
      topProcess: recommendations[0]?.process ?? 'none',
      confidence: recommendations[0]?.confidence ?? 0,
      candidatesCount: recommendations.length,
      traceId,
    });

    // Persist log
    await this.persistLog({
      orgId,
      quoteId: request.quote_id,
      partId: request.part_id,
      requestJson: request,
      responseJson: response,
      traceId,
      elapsedMs: elapsed,
    });

    return response;
  }

  private async fetchGeometryFeatures(partId: string, orgId: string): Promise<GeometryFeatures> {
    const { data, error } = await this.supabase.client
      .from('geometry_features')
      .select('features_json')
      .eq('part_id', partId)
      .eq('org_id', orgId)
      .single();

    if (error || !data?.features_json) {
      this.logger.warn(`No geometry features for part ${partId}: ${error?.message ?? 'missing data'}`);
      return this.defaultGeometryFeatures();
    }

    return data.features_json as GeometryFeatures;
  }

  private async fetchQuoteConfig(quoteId: string, orgId: string): Promise<QuoteConfig> {
    const { data, error } = await this.supabase.client
      .from('quotes')
      .select('config')
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .single();

    if (error || !data?.config) {
      this.logger.warn(`No config for quote ${quoteId}: ${error?.message ?? 'missing data'}`);
      return { requested_process: null, material_code: 'AL-6061', quantity: 1 };
    }

    return data.config as QuoteConfig;
  }

  private defaultGeometryFeatures(): GeometryFeatures {
    return {
      bbox: { x: 100, y: 100, z: 100 },
      volume_mm3: 1000000,
      surface_area_mm2: 60000,
      min_wall_thickness_mm: null,
      cylindricity_hint: false,
      rotational_symmetry_axis: null,
      sheet_like_hint: { is_sheet_like: false, thickness_mm: 0, planar_faces_pct: 0 },
      holes: [],
      pockets: [],
      threads_hint: false,
    };
  }

  private async persistLog(params: {
    orgId: string;
    quoteId: string;
    partId: string;
    requestJson: RecommendRequest;
    responseJson: ProcessRecommendationResponse;
    traceId?: string;
    elapsedMs: number;
  }) {
    try {
      const { error } = await this.supabase.client.from('process_recommendation_logs').insert({
        org_id: params.orgId,
        quote_id: params.quoteId,
        part_id: params.partId,
        request_json: params.requestJson,
        response_json: params.responseJson,
        metadata: {
          trace_id: params.traceId ?? null,
          elapsed_ms: params.elapsedMs,
        },
      });

      if (error) {
        this.logger.warn(`Failed to persist recommendation log: ${error.message}`);
      }
    } catch (error) {
      this.logger.warn(`Unexpected error persisting recommendation log: ${(error as Error)?.message}`);
    }
  }

  private async emitTelemetry(params: {
    event: 'PROC_REC_REQUESTED' | 'PROC_REC_RETURNED' | 'PROC_REC_APPLIED';
    orgId: string;
    quoteId: string;
    partId: string;
    topProcess?: string;
    confidence?: number;
    candidatesCount?: number;
    fromProcess?: string;
    toProcess?: string;
    traceId?: string;
  }) {
    try {
      await this.analytics.trackDfmEvent({
        event: params.event,
        organizationId: params.orgId,
        properties: {
          quote_id: params.quoteId,
          part_id: params.partId,
          top_process: params.topProcess,
          confidence: params.confidence,
          candidates_count: params.candidatesCount,
          from_process: params.fromProcess,
          to_process: params.toProcess,
          trace_id: params.traceId,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to emit process recommendation telemetry: ${(error as Error)?.message}`);
    }
  }
}
