/**
 * Finish Chain Cost Factor (Orchestrator Integration)
 * Replaces legacy finish cost with dynamic formula-based finish chains
 */

import { Injectable, Logger } from '@nestjs/common';
import { PricingContext, PricingFactor } from '../../core/types';
import { FinishesService } from '../../../modules/finishes/finishes.service';
import { FormulaContext } from '../../../modules/finishes/finishes.types';

@Injectable()
export class FinishChainCostFactorService {
  private readonly logger = new Logger(FinishChainCostFactorService.name);

  constructor(private readonly finishesService: FinishesService) {}

  async computeFinishCost(ctx: PricingContext): Promise<void> {
    // Extract quote_line_id from input (assumes it's passed via features or meta)
    const quoteLineId = ctx.input.features?.quote_line_id as string | undefined;
    
    if (!quoteLineId) {
      this.logger.debug('No quote_line_id in pricing input, skipping finish chain cost');
      return;
    }

    try {
      // Fetch existing chain
      const chain = await this.finishesService.getChain(quoteLineId);
      
      if (!chain || chain.steps.length === 0) {
        this.logger.debug(`No finish chain for line ${quoteLineId}, skipping`);
        return;
      }

      // Build formula context from pricing input
      const geometry = ctx.input.features?.geometry || {};
      const context: FormulaContext = {
        area_m2: geometry.surface_area_m2 || 0.1,
        sa: geometry.surface_area_m2 || 0.1,
        volume_cm3: geometry.volume_cm3 || 100,
        v_cm3: geometry.volume_cm3 || 100,
        qty: ctx.input.quantity || 1,
        material: ctx.input.materialCode || 'AL6061',
        region: ctx.input.region || 'US',
        setup_minutes: ctx.input.features?.setup_minutes,
        run_minutes_per_part: ctx.input.features?.run_minutes_per_part,
        batch_size: ctx.input.features?.batch_size,
        part_class: ctx.input.features?.part_class,
      };

      // Compute breakdown (re-evaluate formulas with current context)
      const steps = chain.steps.map(s => ({
        operation_code: s.operation_code,
        params: s.params,
      }));

      const breakdown = await this.finishesService.computeChainCost(steps, context);

      // Add finish cost to pricing context
      const finishCostDollars = breakdown.total_cost_cents / 100;
      ctx.subtotalCost += finishCostDollars;

      // Add breakdown entry
      ctx.breakdown.push({
        key: 'finish_chain_cost',
        label: 'Finish Operations',
        amount: finishCostDollars,
        meta: {
          quote_line_id: quoteLineId,
          operations: breakdown.steps.map(s => s.code),
          steps: breakdown.steps,
          total_cost_cents: breakdown.total_cost_cents,
          added_lead_days: breakdown.added_lead_days,
          computation_mode: breakdown.computation_mode,
        },
      });

      // Optionally update lead time
      if (breakdown.added_lead_days > 0) {
        ctx.timeMinutes += breakdown.added_lead_days * 24 * 60; // Convert days to minutes
      }

      this.logger.debug(
        `Finish chain cost for line ${quoteLineId}: $${finishCostDollars.toFixed(2)}, +${breakdown.added_lead_days} days`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to compute finish chain cost for line ${quoteLineId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      // Graceful degradation: don't fail pricing if finish cost calculation fails
    }
  }
}

/**
 * Finish Chain Cost Factor (Functional wrapper for orchestrator)
 * Integrates FinishesService into pricing orchestrator pipeline
 */
export function createFinishChainCostFactor(
  finishesService: FinishesService,
): PricingFactor {
  const service = new FinishChainCostFactorService(finishesService);

  return {
    name: 'finish_chain_cost',
    stage: 'cost',
    order: 40, // After material cost (30), before tolerance (50)
    applies: (ctx) => {
      // Apply if quote_line_id is present in features
      return !!ctx.input.features?.quote_line_id;
    },
    compute: async (ctx: PricingContext) => {
      await service.computeFinishCost(ctx);
    },
  };
}
