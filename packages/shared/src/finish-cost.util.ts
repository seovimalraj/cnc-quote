import { FinishCatalogItem, MachineCapabilityItem } from './catalog.types';

export interface FinishCostContext {
  partSurfaceAreaCm2?: number;
}

export function computeFinishCostPerPart(
  finish: FinishCatalogItem,
  machine: Pick<MachineCapabilityItem, 'hourly_rate'>,
  ctx: FinishCostContext
): number {
  const perPart = finish.cost_per_part || 0;
  const area = ctx.partSurfaceAreaCm2 || 0;
  const areaVar = finish.cost_per_area_cm2 && area ? finish.cost_per_area_cm2 * area : 0;
  const laborRatePerHour = (machine.hourly_rate || 50) * 0.6; // heuristic mapping
  const prepTimeMin = finish.prep_time_min || 0;
  const rateCm2Min = finish.rate_cm2_min || 0;
  let processTimeMin = 0;
  if (rateCm2Min > 0 && area > 0) {
    const effectiveArea = area * 0.5; // exterior faces approximation
    processTimeMin = effectiveArea / rateCm2Min;
  }
  const totalTimeMin = prepTimeMin + processTimeMin;
  const timeCost = (totalTimeMin / 60) * laborRatePerHour;
  return perPart + areaVar + timeCost;
}
