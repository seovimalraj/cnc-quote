import { PricingContext, PricingFactor } from "../../core/types";

const PRICE_PER_FINISH: Record<string, number> = {
  bead_blast: 8,
  anodize_type_2: 14,
};

export const FinishCostFactor: PricingFactor = {
  name: 'finish_cost',
  stage: 'cost',
  order: 40,
  applies: (ctx) => Array.isArray(ctx.input.finishes) && ctx.input.finishes.length > 0,
  compute: (ctx: PricingContext) => {
    const quantity = Math.max(1, ctx.input.quantity);
    const total = (ctx.input.finishes ?? []).reduce((sum, finish) => sum + (PRICE_PER_FINISH[finish] ?? 0), 0);
    const costPerPart = toMoney(total);
    ctx.subtotalCost += costPerPart;
    ctx.breakdown.push({
      key: 'finish_cost',
      label: 'Finish Operations',
      amount: costPerPart,
      meta: { finishes: ctx.input.finishes, quantity },
    });
  },
};

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}
