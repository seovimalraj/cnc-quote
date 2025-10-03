import { PricingContext, PricingFactor } from '../../core/types';
import { cncMillingCycleMinutes, sheetCycleMinutes, turningCycleMinutes } from '../../process/cycle-time';

export const MachineTimeFactor: PricingFactor = {
  name: 'machine_time',
  stage: 'cost',
  order: 20,
  applies: () => true,
  compute: (ctx: PricingContext) => {
    const perPartMinutes = ctx.input.process === 'cnc_milling'
      ? cncMillingCycleMinutes(ctx.input.features, ctx.input.tolerances)
      : ctx.input.process === 'turning'
        ? turningCycleMinutes(ctx.input.features, ctx.input.tolerances)
        : sheetCycleMinutes(ctx.input.features);

    const quantity = Math.max(1, ctx.input.quantity);
    const totalMinutes = perPartMinutes * quantity;
    ctx.timeMinutes += totalMinutes;

    const rate = machineRate(ctx.input.process);
    const costPerPart = toMoney(perPartMinutes * rate);
    ctx.subtotalCost += costPerPart;
    ctx.breakdown.push({
      key: 'machine_time',
      label: 'Machine Time',
      amount: costPerPart,
      meta: { minutesPerPart: perPartMinutes, quantity, totalMinutes, rate },
    });
  },
};

function machineRate(process: string): number {
  if (process === 'cnc_milling') return 1.6;
  if (process === 'turning') return 1.2;
  return 0.9;
}

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}
