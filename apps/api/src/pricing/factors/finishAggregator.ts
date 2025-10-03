import { Factor, FactorCtx, PriceBreakdownItem } from '../types';
import { createTraceEntry } from '../trace';

export class FinishAggregatorFactor implements Factor {
  code = 'finishAggregator';

  async run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: any[] }> {
    const { cfg, config, runningSubtotal = 0 } = ctx;

    const finishes = cfg.finishes || [];
    const items: PriceBreakdownItem[] = [];
    let totalFinishCost = 0;

    for (const finishCode of finishes) {
      const finishCfg = config.finish[finishCode];
      if (!finishCfg) {
        throw new Error(`Unknown finish code: ${finishCode}`);
      }

      // Calculate finish cost as percentage of running subtotal + minimum fee
      const pctCost = runningSubtotal * finishCfg.addPct;
      const finishCost = Math.max(pctCost, finishCfg.minFee);

      items.push({
        code: `finish_${finishCode}`,
        label: `Finish: ${finishCode}`,
        amount: finishCost,
        meta: {
          addPct: finishCfg.addPct,
          minFee: finishCfg.minFee,
          pctCost,
          runningSubtotal,
        },
      });

      totalFinishCost += finishCost;
    }

    // Create trace entry
    const trace = createTraceEntry(
      this.code,
      {
        finishes,
        runningSubtotal,
      },
      {
        totalFinishCost,
        finishBreakdown: items.map(item => ({
          code: item.code,
          amount: item.amount,
        })),
      },
      finishes.length > 0
        ? `Applied ${finishes.length} finish(es) totaling $${totalFinishCost.toFixed(2)}`
        : 'No finishes applied'
    );

    return { items, trace: [trace] };
  }
}