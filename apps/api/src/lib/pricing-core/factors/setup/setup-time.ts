import { PricingContext, PricingFactor } from "../../core/types";

export const SetupTimeFactor: PricingFactor = {
  name: 'setup_time',
  stage: 'setup',
  order: 10,
  applies: () => true,
  compute: (ctx: PricingContext) => {
    const minutes = setupMinutesForProcess(ctx.input.process, ctx.input.features);
    ctx.timeMinutes += minutes;
    const quantity = Math.max(1, ctx.input.quantity);
    const totalCost = minutesToCost(minutes, ctx.input.process);
    const costPerPart = toMoney(totalCost / quantity);
    ctx.subtotalCost += costPerPart;
    ctx.breakdown.push({
      key: 'setup_time',
      label: 'Setup Time',
      amount: costPerPart,
      meta: { minutes, totalCost },
    });
  },
};

function setupMinutesForProcess(process: string, features?: Record<string, any>): number {
  const featureData = features ?? {};
  const base = process === 'cnc_milling' ? 25 : process === 'turning' ? 20 : 15;
  const holes = featureData.holes?.count ?? 0;
  const fixtures = featureData.fixtures?.count ?? 0;
  return base + Math.min(45, holes * 0.8 + fixtures * 2);
}

function minutesToCost(minutes: number, process: string): number {
  const rate = process === 'cnc_milling' ? 2.2 : process === 'turning' ? 1.8 : 1.5;
  return minutes * rate;
}

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}
