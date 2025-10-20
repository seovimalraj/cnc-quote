import { PricingOrchestrator } from './core/orchestrator';
import { SetupTimeFactor } from './factors/setup/setup-time';
import { MachineTimeFactor } from './factors/cost/machine-time';
import { MaterialCostFactor } from './factors/cost/material-cost';
import { FinishCostFactor } from './factors/cost/finish-cost';
import { ToleranceMultiplierFactor } from './factors/post_cost/tolerance-multiplier';
import { OverheadFactor } from './factors/post_cost/overhead';
import { RiskMarkupFactor } from './factors/post_cost/risk-markup';
import { MarginFactor } from './factors/price/margin';
import type { AdminPricingConfig } from '@cnc-quote/shared';

export interface BuildOrchestratorOptions {
  config?: AdminPricingConfig;
}

export function buildDefaultOrchestrator(options: BuildOrchestratorOptions = {}) {
  const orchestrator = new PricingOrchestrator(undefined, options.config);
  orchestrator.register(SetupTimeFactor);
  orchestrator.register(MachineTimeFactor);
  orchestrator.register(MaterialCostFactor);
  orchestrator.register(FinishCostFactor); // Legacy finish cost (will be deprecated)
  // NOTE: For new finish chain cost integration, use createFinishChainCostFactor()
  // and pass FinishesService instance at runtime
  orchestrator.register(ToleranceMultiplierFactor);
  orchestrator.register(OverheadFactor);
  orchestrator.register(RiskMarkupFactor);
  orchestrator.register(MarginFactor);
  return orchestrator;
}

export type { PricingInput, PricingContext, PricingBreakdownLine } from './core/types';
export { PricingOrchestrator } from './core/orchestrator';
