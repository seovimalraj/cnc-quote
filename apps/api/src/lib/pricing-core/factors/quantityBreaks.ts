import { Factor, FactorCtx, PriceBreakdownItem } from "../types";
import { createTraceEntry } from "../trace";

export class QuantityBreaksFactor implements Factor {
  code = 'quantityBreaks';

  async run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: any[] }> {
    const { cfg, config, runningSubtotal = 0 } = ctx;

    const quantity = cfg.quantity;
    const breaks = config.quantity.breaks;
    const discounts = config.quantity.discountPct;

    // Find applicable discount tier
    let discountPct = 0;
    for (let i = breaks.length - 1; i >= 0; i--) {
      if (quantity >= breaks[i]) {
        discountPct = discounts[i];
        break;
      }
    }

    const discountAmount = runningSubtotal * discountPct;

    // Quantity discounts are negative (reductions)
    const item: PriceBreakdownItem = {
      code: 'quantity_discount',
      label: `Quantity Discount (${quantity} units)`,
      amount: -discountAmount, // Negative for discount
      meta: {
        quantity,
        discountPct,
        runningSubtotal,
        applicableBreak: breaks.find((b, i) => quantity >= b && discounts[i] === discountPct),
      },
    };

    // Create trace entry
    const trace = createTraceEntry(
      this.code,
      { quantity, runningSubtotal },
      { discountAmount, discountPct },
      discountPct > 0
        ? `Applied ${(discountPct * 100).toFixed(1)}% quantity discount for ${quantity} units`
        : `No quantity discount for ${quantity} units`
    );

    return { items: [item], trace: [trace] };
  }
}