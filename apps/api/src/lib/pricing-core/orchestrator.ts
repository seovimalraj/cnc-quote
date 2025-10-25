import { performance } from 'perf_hooks';
import { Factor, PricingResult, QuoteConfig, PricingConfig, PricingCacheAdapter } from './types';
import { hashInput, validateTrace } from './trace';
import { loadPricingConfig } from './config';
import { MaterialCostFactor } from './factors/materialCost';
import { MachineTimeEstimatorFactor } from './factors/machineTimeEstimator';
import { ToleranceFactor } from './factors/tolerance';
import { FeaturePricingFactor } from './factors/featurePricing';
import { FinishAggregatorFactor } from './factors/finishAggregator';
import { RiskAdjusterFactor } from './factors/riskAdjuster';
import { QuantityBreaksFactor } from './factors/quantityBreaks';

export interface PricingOrchestratorOptions {
  configPath?: string;
  factors?: Factor[];
  cache?: PricingCacheAdapter;
  cacheTtlSeconds?: number;
  cacheNamespace?: string;
}

const DEFAULT_CACHE_NAMESPACE = 'pricing:orchestrator:v1';

export class PricingOrchestrator {
  private config: PricingConfig;
  private factors: Factor[];
  private cache?: PricingCacheAdapter;
  private cacheTtlSeconds?: number;
  private cacheNamespace: string;
  private readonly configHash: string;

  constructor(options: PricingOrchestratorOptions = {}) {
    const { configPath, factors, cache, cacheTtlSeconds, cacheNamespace } = options;

    this.config = loadPricingConfig(configPath);
    this.configHash = hashInput(this.config);
    this.cache = cache;
    this.cacheTtlSeconds = cacheTtlSeconds;
    this.cacheNamespace = cacheNamespace || DEFAULT_CACHE_NAMESPACE;

    // Define factor execution order
    this.factors = factors ?? [
      new MaterialCostFactor(),
      new MachineTimeEstimatorFactor(),
      new ToleranceFactor(),
      new FeaturePricingFactor(),
      new FinishAggregatorFactor(),
      new RiskAdjusterFactor(),
      new QuantityBreaksFactor(),
    ];
  }

  async calculatePrice(cfg: QuoteConfig): Promise<PricingResult> {
    const cacheKey = this.cache ? this.buildCacheKey(cfg) : undefined;

    if (cacheKey && this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, cacheHit: true, cacheKey };
      }
    }

    const startTime = performance.now();
    const timings: Record<string, number> = {};
    const breakdown: any[] = [];
    const trace: any[] = [];

    let runningSubtotal = 0;

    // Execute factors in sequence
    for (const factor of this.factors) {
      const factorStart = performance.now();

      try {
        const result = await factor.run({
          cfg,
          config: this.config,
          runningSubtotal,
        });

        // Add items to breakdown
        breakdown.push(...result.items);

        // Update running subtotal
        runningSubtotal += result.items.reduce((sum, item) => sum + item.amount, 0);

        // Add trace entries
        trace.push(...result.trace);

        timings[factor.code] = performance.now() - factorStart;
      } catch (error) {
        // Add error trace entry
        trace.push({
          at: new Date().toISOString(),
          factor: factor.code,
          inputHash: hashInput({ cfg, runningSubtotal }),
          output: { error: error.message },
          note: `Factor failed: ${error.message}`,
        });
        throw error; // Re-throw to stop execution
      }
    }

    const totalTime = performance.now() - startTime;

    // Validate trace
    if (!validateTrace(trace)) {
      throw new Error('Invalid trace generated');
    }

    // Calculate final total
    const subtotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
    const total = Math.max(subtotal, 0); // Ensure non-negative

    const result: PricingResult = {
      subtotal,
      total,
      currency: cfg.currency,
      breakdown,
      trace,
      timings_ms: { ...timings, total: totalTime },
      version: '1.0.0',
      inputHash: hashInput(cfg),
    };

    if (cacheKey && this.cache) {
      await this.cache.set(cacheKey, result, this.cacheTtlSeconds);
    }

    if (cacheKey) {
      return { ...result, cacheHit: false, cacheKey };
    }

    return { ...result, cacheHit: false };
  }

  // Get current config (for testing/debugging)
  getConfig(): PricingConfig {
    return this.config;
  }

  private buildCacheKey(cfg: QuoteConfig): string {
    return `${this.cacheNamespace}:${hashInput({ cfg, configHash: this.configHash })}`;
  }
}
