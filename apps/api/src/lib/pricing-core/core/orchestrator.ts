import { InMemoryFactorRegistry } from './registry';
import { PricingContext, PricingInput } from './types';
import type { AdminPricingConfig } from '@cnc-quote/shared';

export interface OrchestratorSeed extends Partial<PricingContext> {
  flags?: Record<string, boolean>;
}

export class PricingOrchestrator {
  constructor(
    private readonly registry = new InMemoryFactorRegistry(),
    private config?: AdminPricingConfig,
  ) {}

  register = this.registry.register.bind(this.registry);

  setConfig(config: AdminPricingConfig) {
    this.config = config;
  }

  getConfig(): AdminPricingConfig | undefined {
    return this.config;
  }

  async run(input: PricingInput, seed?: OrchestratorSeed) {
    const ctx: PricingContext = {
      input,
      subtotalCost: seed?.subtotalCost ?? 0,
      price: seed?.price ?? 0,
      timeMinutes: seed?.timeMinutes ?? 0,
      breakdown: seed?.breakdown ? [...seed.breakdown] : [],
      logs: seed?.logs ? [...seed.logs] : [],
      flags: seed?.flags ?? {},
      config: seed?.config ?? this.config,
    };

    for (const factor of this.registry.list()) {
      if (!factor.applies(ctx)) {
        ctx.logs.push(`[${factor.stage}] ${factor.name} SKIP`);
        continue;
      }

      ctx.logs.push(`[${factor.stage}] ${factor.name} START`);
      await factor.compute(ctx);
      ctx.logs.push(`[${factor.stage}] ${factor.name} END`);
    }

    return {
      price: ctx.price || ctx.subtotalCost,
      subtotalCost: ctx.subtotalCost,
      timeMinutes: ctx.timeMinutes,
      breakdown: ctx.breakdown,
      logs: ctx.logs,
    };
  }
}
