import { Factor, FactorCtx, PriceBreakdownItem } from "../types";
import { createTraceEntry } from "../trace";
import { FeatureExtractionService } from "../featureExtraction";
import { FeatureExtractionResult } from "../features";

export class FeaturePricingFactor implements Factor {
  code = 'featurePricing';

  private featureExtractor: FeatureExtractionService;

  constructor() {
    this.featureExtractor = new FeatureExtractionService();
  }

  async run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: any[] }> {
    const { cfg, config, runningSubtotal = 0 } = ctx;

    try {
      // Extract features from geometry
      const extractionResult = await this.featureExtractor.extractFeatures(
        cfg.geometry as any,
        cfg.materialCode,
        cfg.processCode
      );

      // Calculate feature-based cost adjustments
      const adjustments = this.calculateFeatureAdjustments(extractionResult, runningSubtotal);

      // Create breakdown items for significant adjustments
      const items: PriceBreakdownItem[] = adjustments
        .filter(adj => Math.abs(adj.amount) > 0.01) // Only include meaningful adjustments
        .map(adj => ({
          code: adj.code,
          label: adj.label,
          amount: adj.amount,
          meta: {
            featureCount: extractionResult.summary.total_features,
            complexityScore: extractionResult.summary.complexity_score,
            dffViolations: extractionResult.summary.dff_violations.length,
            ...adj.meta
          }
        }));

      // Create trace entry
      const trace = createTraceEntry(
        this.code,
        {
          geometry: cfg.geometry,
          materialCode: cfg.materialCode,
          processCode: cfg.processCode
        },
        {
          featureCount: extractionResult.summary.total_features,
          complexityScore: extractionResult.summary.complexity_score,
          totalAdjustment: adjustments.reduce((sum, adj) => sum + adj.amount, 0),
          dffViolations: extractionResult.summary.dff_violations,
          featureTypes: Object.keys(extractionResult.summary.feature_counts),
          confidence: extractionResult.metadata.confidence_score
        },
        `Extracted ${extractionResult.summary.total_features} features, complexity score: ${extractionResult.summary.complexity_score.toFixed(1)}`
      );

      return { items, trace: [trace] };
    } catch (error) {
      // On extraction failure, return empty adjustments with error trace
      const trace = createTraceEntry(
        this.code,
        { geometry: cfg.geometry },
        { error: error.message },
        `Feature extraction failed: ${error.message}`
      );

      return { items: [], trace: [trace] };
    }
  }

  private calculateFeatureAdjustments(
    extractionResult: FeatureExtractionResult,
    runningSubtotal: number
  ): Array<{ code: string; label: string; amount: number; meta?: any }> {
    const adjustments: Array<{ code: string; label: string; amount: number; meta?: any }> = [];

    const { features, summary } = extractionResult;

    // Complexity-based adjustment
    const complexityMultiplier = Math.max(0, (summary.complexity_score - 3) * 0.05); // 5% per complexity point above 3
    if (complexityMultiplier > 0) {
      adjustments.push({
        code: 'complexity_adjustment',
        label: `Complexity Adjustment (Score: ${summary.complexity_score.toFixed(1)})`,
        amount: runningSubtotal * complexityMultiplier,
        meta: { complexityScore: summary.complexity_score, multiplier: complexityMultiplier }
      });
    }

    // Feature count adjustment (economies of scale for simple parts)
    const featureEfficiency = Math.max(0, 1 - summary.total_features * 0.02); // 2% efficiency loss per feature
    if (featureEfficiency < 1) {
      adjustments.push({
        code: 'feature_efficiency',
        label: `Feature Count Adjustment (${summary.total_features} features)`,
        amount: runningSubtotal * (featureEfficiency - 1),
        meta: { featureCount: summary.total_features, efficiency: featureEfficiency }
      });
    }

    // DFM violation penalties
    if (summary.dff_violations.length > 0) {
      const dfmPenalty = summary.dff_violations.length * 0.02; // 2% per DFM issue
      adjustments.push({
        code: 'dfm_penalty',
        label: `DFM Issues (${summary.dff_violations.length} violations)`,
        amount: runningSubtotal * dfmPenalty,
        meta: {
          violationCount: summary.dff_violations.length,
          violations: summary.dff_violations.slice(0, 3) // First 3 for brevity
        }
      });
    }

    // Feature-specific adjustments
    const featureTypeAdjustments = this.calculateFeatureTypeAdjustments(features, runningSubtotal);
    adjustments.push(...featureTypeAdjustments);

    return adjustments;
  }

  private calculateFeatureTypeAdjustments(
    features: any[],
    runningSubtotal: number
  ): Array<{ code: string; label: string; amount: number; meta?: any }> {
    const adjustments: Array<{ code: string; label: string; amount: number; meta?: any }> = [];

    // Group features by type
    const featureGroups = features.reduce((acc, feature) => {
      if (!acc[feature.type]) acc[feature.type] = [];
      acc[feature.type].push(feature);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate adjustments for each feature type
    for (const [type, typeFeatures] of Object.entries(featureGroups)) {
      const adjustment = this.getFeatureTypeAdjustment(type, typeFeatures as any[], runningSubtotal);
      if (adjustment) {
        adjustments.push(adjustment);
      }
    }

    return adjustments;
  }

  private getFeatureTypeAdjustment(
    type: string,
    features: any[],
    runningSubtotal: number
  ): { code: string; label: string; amount: number; meta?: any } | null {
    const count = features.length;
    const avgDifficulty = features.reduce((sum, f) => sum + f.machining_difficulty, 0) / count;

    switch (type) {
      case 'hole': {
        // Holes add cost based on count and difficulty
        const holeCost = runningSubtotal * (count * 0.01 + avgDifficulty * 0.005);
        return {
          code: 'hole_machining',
          label: `Hole Machining (${count} holes, avg difficulty: ${avgDifficulty.toFixed(1)})`,
          amount: holeCost,
          meta: { count, avgDifficulty }
        };
      }

      case 'thread': {
        // Threads are expensive
        const threadCost = runningSubtotal * (count * 0.03);
        return {
          code: 'thread_machining',
          label: `Thread Machining (${count} threads)`,
          amount: threadCost,
          meta: { count }
        };
      }

      case 'undercut': {
        // Undercuts significantly increase cost
        const undercutCost = runningSubtotal * (count * 0.1);
        return {
          code: 'undercut_penalty',
          label: `Undercut Machining (${count} undercuts)`,
          amount: undercutCost,
          meta: { count }
        };
      }

      case 'thin_wall': {
        // Thin walls may require special handling
        const thinWallCost = runningSubtotal * (count * 0.02);
        return {
          code: 'thin_wall_handling',
          label: `Thin Wall Handling (${count} thin walls)`,
          amount: thinWallCost,
          meta: { count }
        };
      }

      default:
        return null;
    }
  }
}