/**
 * Finish Chain Pricing Factor
 * Computes additional cost and lead time from finish operation chains
 */

import { Injectable, Logger } from '@nestjs/common';
import { FinishesService } from "../../../modules/domain/finishes/finishes.service";
import { FormulaContext } from "../../../modules/domain/finishes/finishes.types";

export interface FinishChainFactorInput {
  quote_line_id: string;
  geometry: {
    surface_area_m2: number;
    volume_cm3: number;
  };
  quantity: number;
  material: string;
  region: string;
  setup_minutes?: number;
  run_minutes_per_part?: number;
  batch_size?: number;
  part_class?: string;
}

export interface FinishChainFactorOutput {
  finish_cost_cents: number;
  added_lead_days: number;
  breakdown: Array<{
    code: string;
    name: string;
    sequence: number;
    cost_cents: number;
    lead_days: number;
    params: Record<string, any>;
  }>;
  computation_mode: 'add' | 'max' | 'serial';
}

@Injectable()
export class FinishChainFactor {
  private readonly logger = new Logger(FinishChainFactor.name);

  constructor(private readonly finishesService: FinishesService) {}

  async compute(input: FinishChainFactorInput): Promise<FinishChainFactorOutput> {
    // 1. Fetch existing chain for this line
    const chain = await this.finishesService.getChain(input.quote_line_id);

    if (!chain || chain.steps.length === 0) {
      // No finish chain, return zero cost/lead
      return {
        finish_cost_cents: 0,
        added_lead_days: 0,
        breakdown: [],
        computation_mode: 'add',
      };
    }

    // 2. Build formula context from input
    const context: FormulaContext = {
      area_m2: input.geometry.surface_area_m2,
      sa: input.geometry.surface_area_m2,
      volume_cm3: input.geometry.volume_cm3,
      v_cm3: input.geometry.volume_cm3,
      qty: input.quantity,
      material: input.material,
      region: input.region,
      setup_minutes: input.setup_minutes,
      run_minutes_per_part: input.run_minutes_per_part,
      batch_size: input.batch_size,
      part_class: input.part_class,
    };

    // 3. Compute cost breakdown (re-evaluate formulas with current context)
    const steps = chain.steps.map(s => ({
      operation_code: s.operation_code,
      params: s.params,
    }));

    try {
      const breakdown = await this.finishesService.computeChainCost(steps, context);

      return {
        finish_cost_cents: breakdown.total_cost_cents,
        added_lead_days: breakdown.added_lead_days,
        breakdown: breakdown.steps,
        computation_mode: breakdown.computation_mode,
      };
    } catch (err) {
      this.logger.error(
        `Failed to compute finish chain cost for line ${input.quote_line_id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      // Return zero cost on error (graceful degradation)
      return {
        finish_cost_cents: 0,
        added_lead_days: 0,
        breakdown: [],
        computation_mode: 'add',
      };
    }
  }
}
