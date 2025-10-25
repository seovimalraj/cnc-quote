import { Factor, FactorCtx, PriceBreakdownItem } from "../types";
import { createTraceEntry } from "../trace";
import {
  ToleranceSpec,
  ToleranceCostMapping,
  TOLERANCE_COST_MAPPINGS,
  ISO_TO_TOLERANCE_BAND,
  FEATURE_TOLERANCE_MULTIPLIERS,
  ToleranceBand,
  ToleranceCategory
} from "../tolerance";

export class ToleranceFactor implements Factor {
  code = 'tolerance';

  async run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: any[] }> {
    const { cfg, config, runningSubtotal = 0 } = ctx;

    if (!cfg.tolerance) {
      // No tolerance specified, use default (no additional cost)
      const trace = createTraceEntry(
        this.code,
        { tolerance: null },
        { toleranceMultiplier: 1.0 },
        'No tolerance specified, using default'
      );
      return { items: [], trace: [trace] };
    }

    const tolerance = cfg.tolerance;
    const items: PriceBreakdownItem[] = [];

    // Determine tolerance band from tolerance value or class
    const band = this.determineToleranceBand(tolerance);
    const category = this.determineToleranceCategory(tolerance);

    if (!band || !category) {
      // Unknown tolerance, skip with warning
      const trace = createTraceEntry(
        this.code,
        { tolerance },
        { toleranceMultiplier: 1.0, warning: 'Unknown tolerance specification' },
        'Unable to determine tolerance band/category, skipping cost adjustment'
      );
      return { items: [], trace: [trace] };
    }

    // Find cost mapping
    const mapping = TOLERANCE_COST_MAPPINGS.find(
      m => m.band === band && m.category === category
    );

    if (!mapping) {
      const trace = createTraceEntry(
        this.code,
        { tolerance, band, category },
        { toleranceMultiplier: 1.0, warning: 'No cost mapping found' },
        `No cost mapping for band=${band}, category=${category}`
      );
      return { items: [], trace: [trace] };
    }

    // Calculate feature-specific multiplier
    const featureMultiplier = tolerance.featureCategory
      ? (FEATURE_TOLERANCE_MULTIPLIERS[tolerance.featureCategory] || 1.0)
      : 1.0;

    // Combine multipliers
    const totalBaseMultiplier = mapping.baseMultiplier * featureMultiplier;
    const totalSetupMultiplier = mapping.setupMultiplier * featureMultiplier;

    // Calculate additional costs
    const baseCostAddition = runningSubtotal * (totalBaseMultiplier - 1.0);
    const setupCostAddition = config.machine[cfg.processCode]?.setupMin
      ? (config.machine[cfg.processCode].setupMin * 60 * config.machine[cfg.processCode].hourlyRate) * (totalSetupMultiplier - 1.0)
      : 0;

    const totalToleranceCost = baseCostAddition + setupCostAddition;

    if (totalToleranceCost > 0) {
      items.push({
        code: 'tolerance_adjustment',
        label: `Tolerance: ${band} ${category}${tolerance.featureCategory ? ` (${tolerance.featureCategory})` : ''}`,
        amount: totalToleranceCost,
        meta: {
          band,
          category,
          featureCategory: tolerance.featureCategory,
          baseMultiplier: totalBaseMultiplier,
          setupMultiplier: totalSetupMultiplier,
          baseCostAddition,
          setupCostAddition,
          runningSubtotal,
        },
      });
    }

    // Create trace entry
    const trace = createTraceEntry(
      this.code,
      {
        tolerance,
        band,
        category,
        featureMultiplier,
      },
      {
        totalToleranceCost,
        totalBaseMultiplier,
        totalSetupMultiplier,
        baseCostAddition,
        setupCostAddition,
      },
      totalToleranceCost > 0
        ? `Applied ${band} ${category} tolerance costing $${totalToleranceCost.toFixed(2)}`
        : `Tolerance ${band}/${category} requires no additional cost`
    );

    return { items, trace: [trace] };
  }

  private determineToleranceBand(tolerance: any): ToleranceBand | null {
    // Check for explicit band
    if (tolerance.band) {
      return tolerance.band;
    }

    // Check for tolerance value in micrometers (support both field names)
    if (tolerance.value_um || tolerance.band_um) {
      const value = tolerance.value_um || tolerance.band_um;
      if (value >= 100) return 'coarse';
      if (value >= 50) return 'medium';
      if (value >= 10) return 'fine';
      if (value >= 1) return 'precision';
      return 'ultra_precision';
    }

    // Check for ISO class mapping
    if (tolerance.class) {
      return ISO_TO_TOLERANCE_BAND[tolerance.class] || null;
    }

    return null;
  }

  private determineToleranceCategory(tolerance: any): ToleranceCategory | null {
    // Check for explicit category
    if (tolerance.category) {
      return tolerance.category;
    }

    // Infer from feature category
    if (tolerance.featureCategory) {
      switch (tolerance.featureCategory) {
        case 'hole':
        case 'slot':
        case 'pocket':
          return 'linear';
        case 'surface':
          return 'flatness';
        case 'thread':
          return 'linear'; // Threads have linear tolerances
        default:
          return 'linear';
      }
    }

    // Default to linear
    return 'linear';
  }
}