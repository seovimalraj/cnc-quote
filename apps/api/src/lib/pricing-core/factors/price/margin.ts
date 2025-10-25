import { PricingContext, PricingFactor } from "../../core/types";

export const MarginFactor: PricingFactor = {
  name: 'margin',
  stage: 'price',
  order: 100,
  applies: () => true,
  compute: (ctx: PricingContext) => {
    const baseMargin = 0.28;
    const expressBump = ctx.flags['leadtime.express'] ? 0.05 : 0;
    const marginPct = Math.min(0.6, baseMargin + expressBump);
    const marginAmount = toMoney(ctx.subtotalCost * marginPct);
    ctx.price = toMoney(ctx.subtotalCost + marginAmount);
    ctx.breakdown.push({ key: 'margin', label: 'Margin', amount: marginAmount, meta: { marginPct } });
  },
};

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}
