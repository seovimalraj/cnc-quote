/**
 * Pricing Integration Guide for Finish Chains
 * 
 * This guide shows how to integrate the new finish chain cost factor
 * into your pricing service or controller.
 */

import { Injectable } from '@nestjs/common';
import { PricingOrchestrator } from './core/orchestrator';
import { createFinishChainCostFactor } from './factors/cost/finish-chain-cost';
import { FinishesService } from "../../modules/domain/finishes/finishes.service";
import { SetupTimeFactor } from './factors/setup/setup-time';
import { MachineTimeFactor } from './factors/cost/machine-time';
import { MaterialCostFactor } from './factors/cost/material-cost';
import { ToleranceMultiplierFactor } from './factors/post_cost/tolerance-multiplier';
import { OverheadFactor } from './factors/post_cost/overhead';
import { RiskMarkupFactor } from './factors/post_cost/risk-markup';
import { MarginFactor } from './factors/price/margin';
import type { PricingInput } from './core/types';

/**
 * Example: Pricing Service with Finish Chain Integration
 */
@Injectable()
export class PricingServiceWithFinishChains {
  private readonly orchestrator: PricingOrchestrator;

  constructor(private readonly finishesService: FinishesService) {
    // Build orchestrator with finish chain support
    this.orchestrator = new PricingOrchestrator();
    
    // Register factors in order
    this.orchestrator.register(SetupTimeFactor);
    this.orchestrator.register(MachineTimeFactor);
    this.orchestrator.register(MaterialCostFactor);
    
    // NEW: Register finish chain cost factor
    this.orchestrator.register(createFinishChainCostFactor(this.finishesService));
    
    this.orchestrator.register(ToleranceMultiplierFactor);
    this.orchestrator.register(OverheadFactor);
    this.orchestrator.register(RiskMarkupFactor);
    this.orchestrator.register(MarginFactor);
  }

  async computePrice(input: PricingInput) {
    // Ensure quote_line_id is in input.features for finish chain cost to apply
    const enrichedInput: PricingInput = {
      ...input,
      features: {
        ...input.features,
        quote_line_id: input.features?.quote_line_id, // Must be provided by caller
        geometry: {
          surface_area_m2: input.features?.geometry?.surface_area_m2 || 0.1,
          volume_cm3: input.features?.geometry?.volume_cm3 || 100,
        },
      },
    };

    return await this.orchestrator.run(enrichedInput);
  }
}

/**
 * Example: Quote Controller Integration
 */
export async function exampleQuotePricing(
  quoteLineId: string,
  quantity: number,
  materialCode: string,
  geometry: { surface_area_m2: number; volume_cm3: number },
  finishesService: FinishesService,
) {
  const orchestrator = new PricingOrchestrator();
  orchestrator.register(SetupTimeFactor);
  orchestrator.register(MachineTimeFactor);
  orchestrator.register(MaterialCostFactor);
  orchestrator.register(createFinishChainCostFactor(finishesService));
  orchestrator.register(ToleranceMultiplierFactor);
  orchestrator.register(OverheadFactor);
  orchestrator.register(RiskMarkupFactor);
  orchestrator.register(MarginFactor);

  const input: PricingInput = {
    orgId: 'org-123',
    partId: 'part-456',
    process: 'cnc_milling',
    materialCode,
    quantity,
    region: 'US',
    features: {
      quote_line_id: quoteLineId, // REQUIRED for finish chain cost
      geometry,
    },
  };

  const result = await orchestrator.run(input);

  // Result will include finish_chain_cost in breakdown
  console.log('Price:', result.price);
  console.log('Breakdown:', result.breakdown);
  
  // Find finish chain cost
  const finishCost = result.breakdown.find(b => b.key === 'finish_chain_cost');
  if (finishCost) {
    console.log('Finish operations:', finishCost.meta?.operations);
    console.log('Added lead days:', finishCost.meta?.added_lead_days);
  }

  return result;
}
