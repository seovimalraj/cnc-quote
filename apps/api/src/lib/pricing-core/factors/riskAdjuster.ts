import { Factor, FactorCtx, PriceBreakdownItem } from "../types";
import { createTraceEntry } from "../trace";

export class RiskAdjusterFactor implements Factor {
  code = 'riskAdjuster';

  async run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: any[] }> {
    const { cfg, config, runningSubtotal = 0 } = ctx;

    const riskScore = cfg.risk?.dfm_risk_score ?? 0;
    const items: PriceBreakdownItem[] = [];

    if (riskScore > 0) {
      // Calculate uplift percentage
      const upliftPct = Math.min(
        riskScore * config.risk.upliftPctPerPoint,
        config.risk.capPct
      );

      // Apply uplift to running subtotal
      const upliftAmount = runningSubtotal * upliftPct;

      items.push({
        code: 'risk_uplift',
        label: `Risk Adjustment (${(riskScore * 100).toFixed(0)}% risk)`,
        amount: upliftAmount,
        meta: {
          riskScore,
          upliftPct,
          capPct: config.risk.capPct,
          upliftPctPerPoint: config.risk.upliftPctPerPoint,
          runningSubtotal,
        },
      });

      // Create trace entry
      const trace = createTraceEntry(
        this.code,
        { riskScore, runningSubtotal },
        { upliftAmount, upliftPct },
        `Applied ${(upliftPct * 100).toFixed(1)}% risk uplift (capped at ${(config.risk.capPct * 100).toFixed(0)}%)`
      );

      return { items, trace: [trace] };
    }

    // No risk adjustment
    const trace = createTraceEntry(
      this.code,
      { riskScore },
      { upliftAmount: 0 },
      'No risk adjustment applied (risk score = 0)'
    );

    return { items, trace: [trace] };
  }
}