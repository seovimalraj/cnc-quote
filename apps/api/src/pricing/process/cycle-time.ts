import { PricingInput } from '../core/types';

export function cncMillingCycleMinutes(features?: Record<string, any>, tolerances?: PricingInput['tolerances']): number {
  const holeCount = features?.holes?.count ?? 0;
  const pocketCount = features?.pockets?.count ?? 0;
  const base = 3.5 + holeCount * 0.6 + pocketCount * 0.9;
  const toleranceMultiplier = tightestToleranceMultiplier(tolerances);
  return base * toleranceMultiplier;
}

export function turningCycleMinutes(features?: Record<string, any>, tolerances?: PricingInput['tolerances']): number {
  const operations = features?.turn_ops ?? 1;
  const base = 2.2 * operations;
  return base * tightestToleranceMultiplier(tolerances);
}

export function sheetCycleMinutes(features?: Record<string, any>): number {
  const bends = features?.bends ?? 0;
  const pierces = features?.pierces ?? 0;
  return 1.2 + bends * 0.4 + pierces * 0.02;
}

function tightestToleranceMultiplier(tolerances?: PricingInput['tolerances']): number {
  return 1;
}
