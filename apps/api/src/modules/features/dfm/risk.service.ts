import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AdminFeatureFlagsService } from "../../admin/admin-feature-flags/admin-feature-flags.service";
import {
  IssueTag,
  PersistedRiskResult,
  RiskComputeInput,
  RiskConfigRecord,
  RiskContribution,
  RiskPricingEffect,
  RiskResult,
  RiskSeverity,
  RiskVector,
  RISK_SEVERITY_MARKUP,
  RISK_DIMENSIONS,
} from './risk.model';

const FEATURE_FLAG_KEY = 'dfm_risk_v1';

function clamp(x: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, x));
}

function sigmoidScaled(x: number) {
  return 1 / (1 + Math.exp(-6 * x));
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly analytics: AnalyticsService,
    private readonly featureFlags: AdminFeatureFlagsService,
    private readonly config: ConfigService,
  ) {}

  async computeAndPersist(input: RiskComputeInput): Promise<{ result: RiskResult; pricing: RiskPricingEffect }> {
    const flagEnabled = await this.isFeatureEnabled(input.orgId);
    if (!flagEnabled) {
      this.logger.debug(`dfm risk flag disabled for org=${input.orgId}; returning fallback result`);
      return this.buildFallbackResult(input, 'flag_disabled');
    }

    try {
      const process = input.process || 'cnc_milling';
      const cfg = await this.loadConfig(process);
      const features = await this.loadFeatures(input.geometryId);
      const thresholds = cfg.thresholds_json || {};
      const weights = cfg.weights_json || {};
      const weightSum = this.sumWeights(weights);

      const vector = this.computeVector({ features, thresholds, input });
      const contributions = this.computeContributions(weights, vector, weightSum);
      const score = contributions.reduce((total, item) => total + item.scoreComponent, 0);
      const severity = this.band(score, thresholds?.severity_bands || []);
      const tags = this.buildIssueTags(vector, features, thresholds, cfg.issue_catalog_json || [], severity);

      const result: RiskResult = {
        score: Number(score.toFixed(2)),
        severity,
        vector,
        tags,
        contributions,
      };

      await this.persistResult({
        orgId: input.orgId,
        quoteId: input.quoteId,
        lineId: input.lineId,
        process,
        result,
        materialCode: input.materialCode,
        featuresRef: input.geometryId,
        configVersion: cfg.id,
      });

      const pricing = this.mapSeverityToPricing(result.severity, contributions);

      await this.emitTelemetry('DFM_RISK_COMPUTED', input, result, pricing);

      return { result, pricing };
    } catch (error) {
      this.logger.error(
        `Failed to compute DFM risk for quote=${input.quoteId} line=${input.lineId}: ${(error as Error)?.message}`,
        error,
      );
      await this.emitTelemetry('DFM_RISK_FAILED', input, undefined, undefined, error as Error);
      return this.buildFallbackResult(input, 'compute_error', error as Error);
    }
  }

  async getHistory(orgId: string, quoteId: string, lineId: string): Promise<PersistedRiskResult[]> {
    const { data, error } = await this.supabase.client
      .from('dfm_risk_results')
      .select('*')
      .eq('org_id', orgId)
      .eq('quote_id', quoteId)
      .eq('line_id', lineId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      this.logger.error(`Failed to fetch DFM risk history: ${error.message}`);
      throw error;
    }
    return (data ?? []) as PersistedRiskResult[];
  }

  private async isFeatureEnabled(orgId: string): Promise<boolean> {
    const override = this.config.get<string>('DFM_RISK_V1_FORCE_ENABLE');
    if (typeof override === 'string' && override.length > 0) {
      return ['1', 'true', 'on', 'enable'].includes(override.toLowerCase());
    }

    try {
      const evaluation = await this.featureFlags.evaluateFeatureFlag(FEATURE_FLAG_KEY, {
        organization_id: orgId,
      });
      return Boolean(evaluation?.enabled);
    } catch (error) {
      this.logger.warn(`Feature flag evaluation failed for org=${orgId}: ${(error as Error)?.message}`);
      return false;
    }
  }

  private computeVector({
    features,
    thresholds,
    input,
  }: {
    features: any;
    thresholds: Record<string, any>;
    input: RiskComputeInput;
  }): RiskVector {
    const minWall = Number(features?.min_wall?.global_min_mm || 0);
    const holes = (features?.holes as any[]) || [];
    const pockets = (features?.pockets as any[]) || [];
    const minHoleDia = holes.length
      ? Math.min(...holes.map((h) => Number(h?.diameter_mm || Number.POSITIVE_INFINITY)))
      : Number.POSITIVE_INFINITY;
    const maxPocketDepth = pockets.length
      ? Math.max(...pockets.map((p) => Number(p?.depth_mm || 0)))
      : 0;
    const minAccessRadius = holes.length && isFinite(minHoleDia) ? Math.max(0.1, minHoleDia / 2) : 1.0;
    const tolMin = input.tolerances?.length ? Math.min(...input.tolerances.map((t) => t.value_mm)) : Number.POSITIVE_INFINITY;
    const matHardness = this.estimateHardnessHB(input.materialCode);

    const twWarn = Number(thresholds?.thin_wall_mm?.warning ?? 1.5);
    const twCrit = Number(thresholds?.thin_wall_mm?.critical ?? 0.8);
    const thinRaw = (twWarn - minWall) / Math.max(1e-6, twWarn - twCrit);
    const thin = clamp(sigmoidScaled(thinRaw));

    const dpCrit = Number(thresholds?.deep_pocket_ratio?.critical ?? 6.0);
    const deepRatio = maxPocketDepth / Math.max(1e-6, minAccessRadius);
    const deepWarn = Number(thresholds?.deep_pocket_ratio?.warning ?? dpCrit / 2);
    const deepRaw = deepRatio <= deepWarn ? deepRatio / Math.max(1e-6, deepWarn) : deepRatio / Math.max(1e-6, dpCrit);
    const deep = clamp(deepRaw);

    const shWarn = Number(thresholds?.small_hole_mm?.warning ?? 2.0);
    const shCrit = Number(thresholds?.small_hole_mm?.critical ?? 1.0);
    const smallRaw = (shWarn - (isFinite(minHoleDia) ? minHoleDia : shWarn)) / Math.max(1e-6, shWarn - shCrit);
    const small = clamp(sigmoidScaled(smallRaw));

    const ttWarn = Number(thresholds?.tight_tolerance_mm?.warning ?? 0.05);
    const ttCrit = Number(thresholds?.tight_tolerance_mm?.critical ?? 0.02);
    const tightRaw = (ttWarn - (isFinite(tolMin) ? tolMin : ttWarn)) / Math.max(1e-6, ttWarn - ttCrit);
    const tight = clamp(sigmoidScaled(tightRaw));

    const hbWarn = Number(thresholds?.hardness_hb?.warning ?? 180);
    const hbCrit = Number(thresholds?.hardness_hb?.critical ?? 250);
    const hard = clamp((matHardness - hbWarn) / Math.max(1e-6, hbCrit - hbWarn));

    return {
      thin_walls: Number(thin.toFixed(4)),
      deep_pockets: Number(deep.toFixed(4)),
      small_holes: Number(small.toFixed(4)),
      tight_tolerances: Number(tight.toFixed(4)),
      material_hardness: Number(hard.toFixed(4)),
    };
  }

  private computeContributions(
    weights: Record<string, number>,
    vector: RiskVector,
    weightSum: number,
  ): RiskContribution[] {
    const safeWeightSum = weightSum > 0 ? weightSum : 1;
    return RISK_DIMENSIONS.map((dimension) => {
      const weight = Number(weights?.[dimension] ?? 0);
      const value = vector[dimension];
      const scoreComponent = Number((100 * (weight * value) / safeWeightSum).toFixed(2));
      return {
        dimension,
        weight: Number(weight.toFixed(4)),
        value,
        scoreComponent,
      };
    });
  }

  private sumWeights(weights: Record<string, number>): number {
    return RISK_DIMENSIONS.reduce((acc, dimension) => acc + Number(weights?.[dimension] ?? 0), 0);
  }

  private band(score: number, bands: Array<{ max_score: number; severity: RiskSeverity }>): RiskSeverity {
    for (const band of bands) {
      if (score <= Number(band.max_score)) {
        return band.severity;
      }
    }
    return 'CRITICAL';
  }

  private buildIssueTags(
    vector: RiskVector,
    features: any,
    thresholds: Record<string, any>,
    catalog: Array<Record<string, any>>,
    baseSeverity: RiskSeverity,
  ): IssueTag[] {
    const tags: IssueTag[] = [];

    const catalogByCode = new Map<string, Record<string, any>>((catalog || []).map((entry) => [entry.code, entry]));

    const pushTag = (code: string, dimension: keyof RiskVector, faceIds?: number[]) => {
      const catalogEntry = catalogByCode.get(code) || {};
      const dimensionValue = vector[dimension];
      if (dimensionValue <= 0) return;

      const tagSeverity = this.bumpSeverity(baseSeverity, dimensionValue);
      tags.push({
        code,
        title: catalogEntry.title || this.defaultTitleForCode(code),
        severity: tagSeverity,
        faceIds,
        dfmTip: catalogEntry.dfm_tip,
        link: catalogEntry.link,
        dimension,
      });
    };

    const thinFaces = (features?.min_wall?.samples as any[])?.flatMap((sample) => sample?.face_ids || []) || [];
    pushTag('THIN_WALL', 'thin_walls', thinFaces.length ? thinFaces : undefined);

    pushTag('DEEP_POCKET', 'deep_pockets');

    const smallestHole = ((features?.holes as any[]) || [])
      .filter((hole) => Number.isFinite(hole?.diameter_mm))
      .sort((a, b) => Number(a.diameter_mm || 0) - Number(b.diameter_mm || 0))[0];
    const holeFaces = smallestHole
      ? [smallestHole.entry_face_id, smallestHole.exit_face_id].filter((id) => Number.isFinite(id))
      : undefined;
    pushTag('SMALL_HOLE', 'small_holes', holeFaces as number[] | undefined);

    pushTag('TIGHT_TOL', 'tight_tolerances');
    pushTag('HARD_MAT', 'material_hardness');

    return tags;
  }

  private defaultTitleForCode(code: string): string {
    switch (code) {
      case 'THIN_WALL':
        return 'Thin wall detected';
      case 'DEEP_POCKET':
        return 'Deep pocket ratio high';
      case 'SMALL_HOLE':
        return 'Small hole diameter';
      case 'TIGHT_TOL':
        return 'Tight tolerance region';
      case 'HARD_MAT':
        return 'Hard material machining';
      default:
        return code;
    }
  }

  private bumpSeverity(base: RiskSeverity, value: number): RiskSeverity {
    if (value <= 0.8) {
      return base;
    }
    const order: RiskSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const currentIndex = order.indexOf(base);
    return order[Math.min(order.length - 1, currentIndex + 1)] ?? base;
  }

  private mapSeverityToPricing(severity: RiskSeverity, contributions: RiskContribution[]): RiskPricingEffect {
  const markupDelta = RISK_SEVERITY_MARKUP[severity] ?? 0;
    return {
      risk_markup: Number((1 + markupDelta).toFixed(3)),
      severity,
      contributions,
    };
  }

  private buildFallbackResult(
    input: RiskComputeInput,
    reason: 'flag_disabled' | 'compute_error',
    error?: Error,
  ): { result: RiskResult; pricing: RiskPricingEffect } {
    if (error) {
      this.logger.warn(`Returning fallback risk result for ${input.quoteId}/${input.lineId}: ${error.message}`);
    }

    const zeroVector: RiskVector = {
      thin_walls: 0,
      deep_pockets: 0,
      small_holes: 0,
      tight_tolerances: 0,
      material_hardness: 0,
    };

    const zeroContributions: RiskContribution[] = RISK_DIMENSIONS.map((dimension) => ({
      dimension,
      weight: 0,
      value: 0,
      scoreComponent: 0,
    }));

    const tags: IssueTag[] = [
      {
        code: 'RISK_UNAVAILABLE',
        title: 'Risk scoring unavailable',
        severity: 'LOW',
        dfmTip: reason === 'flag_disabled'
          ? 'Risk scoring is rolling out gradually. Legacy pricing heuristics are used for now.'
          : 'We could not compute a new risk score. The previous heuristic pricing will be used.',
      },
    ];

    const result: RiskResult = {
      score: 0,
      severity: 'LOW',
      vector: zeroVector,
      tags,
      contributions: zeroContributions,
    };

    return {
      result,
      pricing: {
        risk_markup: 1,
        severity: 'LOW',
        contributions: zeroContributions,
      },
    };
  }

  private async loadConfig(process: string): Promise<RiskConfigRecord> {
    const { data, error } = await this.supabase.client
      .from('dfm_risk_configs')
      .select('*')
      .eq('process', process)
      .order('effective_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Risk config not found for process=${process}`);
    }

    return data as RiskConfigRecord;
  }

  private async loadFeatures(geometryId: string): Promise<any> {
    const { data, error } = await this.supabase.client
      .from('geometry_features')
      .select('features_json')
      .eq('id', geometryId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Geometry features not found');
    }

    return (data as any).features_json || {};
  }

  private async persistResult(args: {
    orgId: string;
    quoteId: string;
    lineId: string;
    process: string;
    result: RiskResult;
    materialCode?: string;
    featuresRef?: string;
    configVersion?: string;
  }) {
    const { error } = await this.supabase.client.from('dfm_risk_results').insert({
      org_id: args.orgId,
      quote_id: args.quoteId,
      line_id: args.lineId,
      process: args.process,
      risk_vector: args.result.vector,
      score: args.result.score,
      severity: args.result.severity,
      issue_tags: args.result.tags,
      material_code: args.materialCode,
      features_ref: args.featuresRef,
      config_version: args.configVersion,
    });
    if (error) {
      this.logger.error(`Persist dfm_risk_results failed: ${error.message}`);
      throw error;
    }
  }

  private estimateHardnessHB(materialCode?: string): number {
    if (!materialCode) return 150;
    const code = materialCode.toUpperCase();
    if (code.includes('6061') || code.includes('AL')) return 95;
    if (code.includes('SS') || code.includes('304') || code.includes('316')) return 200;
    if (code.includes('STEEL') || code.includes('1018') || code.includes('1045')) return 150;
    if (code.includes('TITANIUM') || code.includes('TI-6AL-4V')) return 320;
    if (code.includes('BRASS') || code.includes('C360')) return 80;
    return 150;
  }

  private async emitTelemetry(
    event: 'DFM_RISK_COMPUTED' | 'DFM_RISK_FAILED',
    input: RiskComputeInput,
    result?: RiskResult,
    pricing?: RiskPricingEffect,
    error?: Error,
  ) {
    try {
      await this.analytics.trackDfmEvent({
        event,
        organizationId: input.orgId,
        properties: {
          quote_id: input.quoteId,
          line_id: input.lineId,
          process: input.process,
          severity: result?.severity,
          score: result?.score,
          risk_markup: pricing?.risk_markup,
          error: error ? error.message : undefined,
        },
      });
    } catch (telemetryError) {
      this.logger.warn(`Failed to emit risk telemetry: ${(telemetryError as Error)?.message}`);
    }
  }
}

