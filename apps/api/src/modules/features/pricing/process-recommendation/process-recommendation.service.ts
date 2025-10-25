import { Injectable, Logger } from '@nestjs/common';
import {
  ContractsV1,
  ProcessRecommendationBundle,
  ProcessRecommendationCandidate,
  ProcessRecommendationAdjustment,
  ProcessRecommendationInputSummary,
} from '@cnc-quote/shared';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { GeometryService } from "../../geometry/geometry.service";
import { PROCESS_RECOMMENDATION_RULES } from './process-recommendation.rules';
import {
  NormalizedPartMetrics,
  ProcessRuleContext,
  RuleAdjuster,
} from './process-recommendation.types';

const STRATEGY_ID = 'rules_v0';
const CLASSIFIER_VERSION = '2025-09-30';

interface PricingSummarySnapshot {
  quantity: number;
  unit_price?: number;
  lead_time_days?: number;
  currency?: string;
}

type PartConfigV1 = ContractsV1.PartConfigV1;

interface RecommendArgs {
  orgId: string;
  partConfig: PartConfigV1;
  geometryData?: any;
  quoteId?: string | null;
  lineId?: string | null;
  traceId?: string;
  persistLog?: boolean;
  pricingSummary?: PricingSummarySnapshot | null;
}

interface CandidateState {
  code: string;
  displayName: string;
  family: ProcessRecommendationCandidate['process_family'];
  leadTimeClass?: ProcessRecommendationCandidate['estimated_lead_time_class'];
  costClass?: ProcessRecommendationCandidate['estimated_cost_class'];
  baseScore: number;
  score: number;
  reasons: Set<string>;
  cautions: Set<string>;
}

const CANDIDATE_LIBRARY: Array<Pick<CandidateState, 'code' | 'displayName' | 'family' | 'leadTimeClass' | 'costClass' | 'baseScore'>> = [
  {
    code: 'cnc_milling_3axis',
    displayName: '3-Axis CNC Milling',
    family: 'cnc_milling',
    leadTimeClass: 'standard',
    costClass: 'comparable',
    baseScore: 0.45,
  },
  {
    code: 'cnc_milling_5axis',
    displayName: '5-Axis CNC Milling',
    family: 'cnc_milling',
    leadTimeClass: 'extended',
    costClass: 'higher',
    baseScore: 0.35,
  },
  {
    code: 'cnc_turning',
    displayName: 'CNC Turning',
    family: 'cnc_turning',
    leadTimeClass: 'fast',
    costClass: 'lower',
    baseScore: 0.3,
  },
  {
    code: 'sheet_metal_laser',
    displayName: 'Sheet Metal Laser + Forming',
    family: 'sheet_metal',
    leadTimeClass: 'fast',
    costClass: 'lower',
    baseScore: 0.3,
  },
  {
    code: 'sheet_metal_brake',
    displayName: 'Sheet Metal Brake Forming',
    family: 'sheet_metal',
    leadTimeClass: 'standard',
    costClass: 'comparable',
    baseScore: 0.25,
  },
  {
    code: 'additive_sls',
    displayName: 'Additive Manufacturing (SLS)',
    family: 'additive',
    leadTimeClass: 'standard',
    costClass: 'higher',
    baseScore: 0.2,
  },
];

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

@Injectable()
export class ProcessRecommendationService {
  private readonly logger = new Logger(ProcessRecommendationService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly geometryService: GeometryService,
  ) {}

  async recommend(args: RecommendArgs): Promise<ProcessRecommendationBundle> {
    const start = Date.now();
    const geometrySource = await this.resolveGeometrySource(args);
    const metrics = this.normalizeMetrics(args.partConfig, geometrySource);
    const dfmIssues = Array.isArray(args.partConfig?.dfm?.issues) ? args.partConfig.dfm.issues : [];
    const quantity = this.resolveQuantity(args.partConfig);
    const materialCode = this.resolveMaterialCode(args.partConfig);
    const finishIds = this.resolveFinishIds(args.partConfig);
    const toleranceClass = this.resolveToleranceClass(args.partConfig);
    const geometryFlags = this.computeGeometryFlags(metrics, dfmIssues);

    const context: ProcessRuleContext = {
      partConfig: args.partConfig,
      quantity,
      materialCode,
      finishIds,
      toleranceClass,
      metrics,
      dfmIssues,
      geometryFlags,
    };

    const candidateMap = this.initializeCandidates();
    const ruleTrace = this.applyRules(context, candidateMap);
    const rankedCandidates = this.rankCandidates(candidateMap);

    const evaluationMs = Date.now() - start;
    const generatedAt = new Date().toISOString();

    const summary = this.buildInputSummary(args, metrics, quantity, materialCode, generatedAt);

    const bundle: ProcessRecommendationBundle = {
      strategy: STRATEGY_ID,
      classifier_version: CLASSIFIER_VERSION,
      primary: rankedCandidates[0] ?? null,
      alternatives: rankedCandidates.slice(1, 4),
      rule_trace: ruleTrace,
      input_summary: summary,
      metadata: {
        evaluation_ms: evaluationMs,
        generated_at: generatedAt,
        part_config_ref: {
          id: args.partConfig.id,
          quote_id: args.partConfig.quote_id,
          process_type: args.partConfig.process_type,
          selected_quantity: args.partConfig.selected_quantity,
        },
      },
    };

    if (args.persistLog !== false) {
      await this.persistLog({
        orgId: args.orgId,
        quoteId: args.quoteId ?? args.partConfig.quote_id ?? null,
        lineId: args.lineId ?? args.partConfig.id ?? null,
        bundle,
        metrics,
        context,
        ruleTrace,
        traceId: args.traceId,
        pricingSummary: args.pricingSummary,
      });
    }

    return bundle;
  }

  private async resolveGeometrySource(args: RecommendArgs): Promise<any> {
    if (args.geometryData) {
      return args.geometryData;
    }
    const partId = args.lineId ?? args.partConfig?.id;
    if (!partId || !args.orgId) {
      return null;
    }
    try {
      const row = await this.geometryService.getStoredFeatures(partId, args.orgId);
      return row?.features_json ?? null;
    } catch (error) {
      this.logger.debug(`No stored geometry features for part ${partId}: ${(error as Error)?.message ?? error}`);
      return null;
    }
  }

  private initializeCandidates(): Map<string, CandidateState> {
    return new Map(
      CANDIDATE_LIBRARY.map((candidate) => [
        candidate.code,
        {
          ...candidate,
          score: candidate.baseScore,
          reasons: new Set<string>(['Baseline capability']),
          cautions: new Set<string>(),
        } as CandidateState,
      ]),
    );
  }

  private applyRules(
    context: ProcessRuleContext,
    candidates: Map<string, CandidateState>,
  ): ProcessRecommendationBundle['rule_trace'] {
    return PROCESS_RECOMMENDATION_RULES.map((rule) => {
      const adjustments: ProcessRecommendationAdjustment[] = [];
      const adjust: RuleAdjuster = (processCode, delta, reason, options) => {
        const candidate = candidates.get(processCode);
        if (!candidate) {
          this.logger.warn(`Rule ${rule.id} attempted to adjust unknown candidate ${processCode}`);
          return;
        }
        const normalizedReason = reason?.trim().length ? reason.trim() : rule.description;
        candidate.score += delta;
        if (options?.caution) {
          candidate.cautions.add(normalizedReason);
        } else {
          candidate.reasons.add(normalizedReason);
        }
        adjustments.push({
          process_code: processCode,
          delta: Number(delta.toFixed(3)),
          reason: normalizedReason,
          caution: options?.caution ?? false,
        });
      };

      try {
        rule.evaluate(context, adjust);
      } catch (error) {
        this.logger.warn(`Rule ${rule.id} evaluation error: ${(error as Error)?.message ?? error}`);
      }

      return {
        rule_id: rule.id,
        description: rule.description,
        adjustments,
        triggered: adjustments.length > 0,
      };
    });
  }

  private rankCandidates(candidates: Map<string, CandidateState>): ProcessRecommendationCandidate[] {
    const resolved = Array.from(candidates.values()).map((candidate) => {
      const rawScore = Number(candidate.score.toFixed(3));
      const finalScore = rawScore < 0 ? 0 : rawScore;
      return {
        code: candidate.code,
        family: candidate.family,
        displayName: candidate.displayName,
        score: finalScore,
        reasons: Array.from(candidate.reasons),
        cautions: Array.from(candidate.cautions),
        leadTimeClass: candidate.leadTimeClass,
        costClass: candidate.costClass,
      };
    });

    resolved.sort((a, b) => b.score - a.score);
    const topScore = resolved[0]?.score ?? 0;

    return resolved.map<ProcessRecommendationCandidate>((candidate) => ({
      process_code: candidate.code,
      process_family: candidate.family,
      display_name: candidate.displayName,
      score: Number(candidate.score.toFixed(3)),
      confidence: topScore > 0 ? Number((candidate.score / topScore).toFixed(3)) : 0,
      reasons: candidate.reasons,
      cautions: candidate.cautions,
      estimated_lead_time_class: candidate.leadTimeClass,
      estimated_cost_class: candidate.costClass,
    }));
  }

  private normalizeMetrics(partConfig: PartConfigV1, geometrySource: any): NormalizedPartMetrics {
    const metricsSource = this.extractMetricsSource(partConfig, geometrySource);
    const bboxSource = metricsSource?.bbox ?? metricsSource?.bounding_box ?? null;

    const length = this.extractBoundingDimension(bboxSource, 'x');
    const width = this.extractBoundingDimension(bboxSource, 'y');
    const height = this.extractBoundingDimension(bboxSource, 'z');
    const dims = [length, width, height].filter((value): value is number => isFiniteNumber(value) && value > 0);
    const aspectRatio = dims.length >= 2 ? Number((Math.max(...dims) / Math.min(...dims)).toFixed(3)) : null;

    const featuresSource = metricsSource?.features ?? {};
    const featureSummary = metricsSource?.summary ?? metricsSource?.feature_summary ?? {};

    const sheetSource = metricsSource?.sheet ?? {};

    return {
      volumeCc: this.toNumber(metricsSource?.volume_cc ?? metricsSource?.volume ?? null),
      surfaceAreaCm2: this.toNumber(metricsSource?.surface_area_cm2 ?? metricsSource?.surface_area ?? null),
      bbox: {
        length,
        width,
        height,
        aspectRatio,
      },
      features: {
        holes: this.toCount(featuresSource?.holes),
        pockets: this.toCount(featuresSource?.pockets),
        threads: this.toCount(featuresSource?.threads),
        bosses: this.toCount(featuresSource?.bosses),
        bends: this.toCount(featuresSource?.bends ?? sheetSource?.bend_count),
        thinWalls: this.toCount(featuresSource?.thin_walls ?? featureSummary?.thin_walls),
        undercuts: this.toCount(featuresSource?.undercuts ?? featureSummary?.undercuts),
        total: this.toNumber(featureSummary?.total ?? metricsSource?.total_features ?? null),
        complexityScore: this.toNumber(featureSummary?.complexity_score ?? metricsSource?.complexity_score ?? null),
      },
      sheet: {
        thicknessMm: this.toNumber(sheetSource?.thickness_mm ?? sheetSource?.thicknessMm ?? null),
        flatAreaCm2: this.toNumber(sheetSource?.flat_pattern_area_cm2 ?? sheetSource?.area_cm2 ?? sheetSource?.area ?? null),
        cutLengthMm: this.toNumber(sheetSource?.cut_length_mm ?? sheetSource?.cutLengthMm ?? null),
        bendCount: this.toCount(sheetSource?.bend_count ?? sheetSource?.bends),
        nestUtilization: this.toNumber(sheetSource?.nest_utilization ?? sheetSource?.nestUtilization ?? null),
      },
    };
  }

  private extractMetricsSource(partConfig: PartConfigV1, geometrySource: any): Record<string, any> {
    const partMetrics = partConfig?.geometry?.metrics ?? {};
    const overrideMetrics = this.ensureMetricsObject(geometrySource);
    return {
      ...partMetrics,
      ...overrideMetrics,
      features: {
        ...(partMetrics?.features ?? {}),
        ...(overrideMetrics?.features ?? {}),
      },
      sheet: {
        ...(partMetrics?.sheet ?? {}),
        ...(overrideMetrics?.sheet ?? {}),
      },
      summary: {
        ...(partMetrics as any)?.summary,
        ...(overrideMetrics?.summary ?? overrideMetrics?.feature_summary ?? {}),
      },
    };
  }

  private ensureMetricsObject(source: any): Record<string, any> {
    if (!source) {
      return {};
    }
    if (source.metrics && typeof source.metrics === 'object') {
      return source.metrics;
    }
    if (source.geometry?.metrics && typeof source.geometry.metrics === 'object') {
      return source.geometry.metrics;
    }
    return source;
  }

  private extractBoundingDimension(bbox: any, axis: 'x' | 'y' | 'z'): number | null {
    if (!bbox) {
      return null;
    }
    const lower = bbox?.min?.[axis];
    const upper = bbox?.max?.[axis];
    if (isFiniteNumber(lower) && isFiniteNumber(upper)) {
      const value = Math.abs(upper - lower);
      return value > 0 ? Number(value.toFixed(3)) : null;
    }
    const direct = bbox?.[axis];
    if (isFiniteNumber(direct)) {
      return Number(direct.toFixed(3));
    }
    let altKey: 'length' | 'width' | 'height';
    if (axis === 'x') {
      altKey = 'length';
    } else if (axis === 'y') {
      altKey = 'width';
    } else {
      altKey = 'height';
    }
    const altValue = bbox?.[altKey];
    return this.toNumber(altValue);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private toCount(value: unknown): number {
    const numeric = this.toNumber(value);
    if (!numeric || numeric < 0) {
      return 0;
    }
    return Math.round(numeric);
  }

  private computeGeometryFlags(metrics: NormalizedPartMetrics, dfmIssues: PartConfigV1['dfm']['issues']): string[] {
    const flags = new Set<string>();
    this.appendSheetFlags(metrics.sheet, flags);
    this.appendBoundingBoxFlags(metrics.bbox, flags);
    this.appendFeatureFlags(metrics, flags);
    this.appendDfmFlags(dfmIssues, flags);
    return Array.from(flags);
  }

  private appendSheetFlags(sheet: NormalizedPartMetrics['sheet'], flags: Set<string>): void {
    if (!isFiniteNumber(sheet.thicknessMm)) {
      return;
    }
    if (sheet.thicknessMm <= 3) {
      flags.add('thin_sheet');
    }
    if (sheet.thicknessMm >= 8) {
      flags.add('thick_sheet');
    }
  }

  private appendBoundingBoxFlags(bbox: NormalizedPartMetrics['bbox'], flags: Set<string>): void {
    if (!isFiniteNumber(bbox.aspectRatio) || (bbox.aspectRatio ?? 0) < 3) {
      return;
    }
    flags.add('high_aspect_ratio');
    if (isFiniteNumber(bbox.width) && isFiniteNumber(bbox.height)) {
      const diff = Math.abs(bbox.width - bbox.height);
      const denom = Math.max(bbox.width, bbox.height, 1);
      if (denom > 0 && diff / denom <= 0.25) {
        flags.add('cylindrical_like');
      }
    }
  }

  private appendFeatureFlags(metrics: NormalizedPartMetrics, flags: Set<string>): void {
    if ((metrics.features.total ?? 0) >= 20) {
      flags.add('complex_geometry');
    }
    if ((metrics.features.bends ?? 0) >= 6) {
      flags.add('numerous_bends');
    }
  }

  private appendDfmFlags(dfmIssues: PartConfigV1['dfm']['issues'], flags: Set<string>): void {
    for (const issue of dfmIssues) {
      switch (issue.category) {
        case 'undercut':
          flags.add('undercut_detected');
          break;
        case 'thin_wall':
          flags.add('thin_wall_detected');
          break;
        case 'geometry_complexity':
        case 'feature_density':
          flags.add('complex_geometry');
          break;
        default:
          break;
      }
    }
  }

  private resolveQuantity(partConfig: PartConfigV1): number {
    if (typeof partConfig.selected_quantity === 'number' && partConfig.selected_quantity > 0) {
      return partConfig.selected_quantity;
    }
    if (Array.isArray(partConfig.quantities) && partConfig.quantities.length > 0) {
      return partConfig.quantities[0];
    }
    return 1;
  }

  private resolveMaterialCode(partConfig: PartConfigV1): string | null {
    const candidates: unknown[] = [
      (partConfig as any)?.material_code,
      partConfig.material_spec,
      partConfig.material_id,
      (partConfig as any)?.material?.code,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return null;
  }

  private resolveFinishIds(partConfig: PartConfigV1): string[] {
    const ids = new Set<string>();
    const push = (value: unknown) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        ids.add(value.trim());
      }
    };
    const potential = [partConfig.finish_ids, (partConfig as any)?.finishes, partConfig.secondary_operations];
    for (const candidate of potential) {
      if (Array.isArray(candidate)) {
        candidate.forEach(push);
      } else {
        push(candidate);
      }
    }
    return Array.from(ids);
  }

  private resolveToleranceClass(partConfig: PartConfigV1): string | undefined {
    const tolerance = partConfig.tolerance_class ?? (partConfig as any)?.tolerance;
    return typeof tolerance === 'string' ? tolerance : undefined;
  }

  private buildInputSummary(
    args: RecommendArgs,
    metrics: NormalizedPartMetrics,
    quantity: number,
    materialCode: string | null,
    generatedAt: string,
  ): ProcessRecommendationInputSummary {
    const bboxLength = metrics.bbox.length;
    const bboxWidth = metrics.bbox.width;
    const bboxHeight = metrics.bbox.height;
    let boundingBox: [number, number, number] | null = null;
    if (isFiniteNumber(bboxLength) && isFiniteNumber(bboxWidth) && isFiniteNumber(bboxHeight)) {
      boundingBox = [bboxLength, bboxWidth, bboxHeight];
    }

    return {
      quantity,
      material: materialCode,
      bounding_box_mm: boundingBox,
      volume_cc: metrics.volumeCc,
      surface_area_cm2: metrics.surfaceAreaCm2,
      source_part_config_id: args.partConfig.id ?? null,
      source_quote_id: args.partConfig.quote_id ?? null,
      snapshot_at: generatedAt,
    };
  }

  private async persistLog(params: {
    orgId: string;
    quoteId: string | null;
    lineId: string | null;
    bundle: ProcessRecommendationBundle;
    metrics: NormalizedPartMetrics;
    context: ProcessRuleContext;
    ruleTrace: ProcessRecommendationBundle['rule_trace'];
    traceId?: string;
    pricingSummary?: PricingSummarySnapshot | null;
  }) {
    const { orgId, quoteId, lineId, bundle, metrics, context, ruleTrace, traceId, pricingSummary } = params;
    if (!orgId || !quoteId || !lineId) {
      return;
    }

    const primaryCode = bundle.primary?.process_code ?? 'unresolved';
    const primaryFamily = bundle.primary?.process_family ?? 'unknown';
    const confidence = bundle.primary?.confidence ?? null;

    const inputSnapshot = {
      summary: bundle.input_summary,
      metrics,
      geometry_flags: context.geometryFlags,
      finishes: context.finishIds,
      tolerance_class: context.toleranceClass ?? null,
    };

    const metadata = {
      trace_id: traceId ?? null,
      pricing: pricingSummary ?? null,
      evaluation_ms: bundle.metadata?.evaluation_ms ?? null,
    };

    try {
      const { error } = await this.supabase.client.from('process_recommendation_logs').insert({
        org_id: orgId,
        quote_id: quoteId,
        line_id: lineId,
        primary_process_code: primaryCode,
        primary_process_family: primaryFamily,
        strategy: bundle.strategy,
        classifier_version: bundle.classifier_version,
        confidence,
        recommendations: {
          primary: bundle.primary,
          alternatives: bundle.alternatives,
          metadata: bundle.metadata,
        },
        rule_trace: ruleTrace,
        input_snapshot: inputSnapshot,
        metadata,
      });
      if (error) {
        this.logger.warn(`Failed to persist process recommendation log: ${error.message}`);
      }
    } catch (error) {
      this.logger.warn(`Unexpected error persisting process recommendation log: ${(error as Error)?.message ?? error}`);
    }
  }
}
