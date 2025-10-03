import { PricingContext, PricingFactor } from '../../core/types';

const OVERHEAD_RATE = 0.15;

export const OverheadFactor: PricingFactor = {
  name: 'overhead',
  stage: 'post_cost',
  order: 55,
  applies: () => true,
  compute: (ctx: PricingContext) => {
    const overhead = toMoney(ctx.subtotalCost * OVERHEAD_RATE);
    ctx.subtotalCost += overhead;
    ctx.breakdown.push({ key: 'overhead', label: 'Overhead', amount: overhead, meta: { rate: OVERHEAD_RATE } });
  },
};

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}
