import { GeometryMetricsV1 } from './contracts/v1/part-config';
import { CostFactorsV1, PricingBreakdownDetailedV1 } from './contracts/v1/pricing';

/**
 * Phase 1 Base Pricing Computation Utility
 * ---------------------------------------
 * Lightweight, deterministic cost roll-up translating CostFactorsV1 + geometry + quantity
 * into a PricingBreakdownDetailedV1 structure. This intentionally omits advanced cycle time
 * modeling, nesting, fixture amortization, real material density, and stochastic adjustments.
 * Those are scheduled for later phases.
 */

export interface ComputePricingInput {
  quantity: number;
  metrics: GeometryMetricsV1;
  factors: CostFactorsV1;
  /** Optional tolerance multiplier (e.g. 1 = standard, 1.15 precision, 1.35 high precision) */
  tolerance_multiplier?: number;
  /** Optional external pre-computed cycle time (minutes) overrides */
  overrides?: {
    machine_time_min?: number; // direct machine engagement time
    cycle_time_min?: number; // overall cycle (machine + handling)
    material_mass_kg?: number; // if caller has precise mass
  };
}

export interface ComputePricingResult extends PricingBreakdownDetailedV1 {}

// --- Internal helper heuristics ---------------------------------------------------------

// Very rough placeholder feed rate / removal rate heuristics (Phase 1)
const DEFAULT_REMOVAL_RATE_CC_PER_MIN = 8; // extremely conservative placeholder
const DEFAULT_FEATURE_TIME_MAP: Record<string, number> = {
  holes: 0.25, // minutes
  pockets: 0.8,
  slots: 0.4,
  faces: 0.15,
  bends: 0.6,
  corners: 0.05,
  threads: 0.5,
};

// Placeholder density (kg per cc) for demo; real implementation will look up material.
const DEFAULT_DENSITY_KG_PER_CC = 0.0000078; // ~7.8 g/cc for steel analog

function estimateMachineTimeMinutes(metrics: GeometryMetricsV1): number {
  let time = 0;
  if (metrics.volume_cc && metrics.features?.holes !== undefined && metrics.features?.pockets !== undefined) {
    // Use removal-based estimate if removed volume known (future expansion)
    // For now: sum feature heuristics.
  }
  if (metrics.features) {
    for (const [k, v] of Object.entries(metrics.features)) {
      if (v && DEFAULT_FEATURE_TIME_MAP[k]) {
        time += v * DEFAULT_FEATURE_TIME_MAP[k];
      }
    }
  }
  // Fallback if no features known, assume minimal handling time.
  if (time === 0 && metrics.volume_cc) {
    time = (metrics.volume_cc / DEFAULT_REMOVAL_RATE_CC_PER_MIN) * 0.25; // partial engagement placeholder
    if (time < 0.5) time = 0.5;
  }
  return time;
}

function estimateMaterialMassKg(metrics: GeometryMetricsV1): number {
  if (!metrics.volume_cc) return 0;
  return metrics.volume_cc * DEFAULT_DENSITY_KG_PER_CC;
}

function selectQuantityDiscount(factors: CostFactorsV1, quantity: number): number {
  if (!factors.quantity_breaks || factors.quantity_breaks.length === 0) return 0;
  let applicable = 0;
  for (const br of factors.quantity_breaks) {
    if (quantity >= br.min_qty) {
      // discount_percent assumed to be a percentage (e.g. 10 for 10%) in current CostFactorsV1 usage.
      applicable = br.discount_percent;
    }
  }
  return applicable / 100; // convert to fraction
}

// --- Public API ------------------------------------------------------------------------

export function computePricingBreakdown(input: ComputePricingInput): ComputePricingResult {
  const { quantity, metrics, factors, overrides, tolerance_multiplier } = input;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  // Machine time per part (minutes)
  const machine_time_min = overrides?.machine_time_min ?? estimateMachineTimeMinutes(metrics);
  const cycle_time_min = overrides?.cycle_time_min ?? machine_time_min; // placeholder: treat cycle = machine

  // Material mass estimate (kg) per part
  const material_mass_kg = overrides?.material_mass_kg ?? estimateMaterialMassKg(metrics);

  // Component costs (per part)
  const tolMul = tolerance_multiplier && tolerance_multiplier > 0 ? tolerance_multiplier : 1;
  const machining = (machine_time_min / 60) * factors.machine_rate_per_hour * tolMul;

  // Setup cost amortized per part; retain full for overhead base via fullSetupCost variable.
  const fullSetupCost = factors.setup_cost;
  const setup = fullSetupCost / quantity;

  const material = material_mass_kg * (factors.material_price_per_kg ?? 0);

  let finish = 0;
  if (factors.finish_cost_adders) {
    for (const v of Object.values(factors.finish_cost_adders)) finish += v;
  }

  const inspectionBase = factors.inspection_cost_per_part ?? 0;
  const inspection = inspectionBase * (tolMul > 1 ? (1 + (tolMul - 1) * 0.8) : 1); // lighter scaling than machining

  // Overhead applied on (machine + material + full setup amortized back to unit) per initial design
  const overhead_base = machining + material + setup;
  const overhead = (factors.overhead_percent ?? 0) * overhead_base;

  const unit_cost_before_margin = material + machining + setup + finish + inspection + overhead;
  const margin = unit_cost_before_margin * factors.base_margin_percent;
  let unit_price = unit_cost_before_margin + margin;

  // Apply quantity discount (after margin, before rush) to mimic typical commercial policy
  const discount_fraction = selectQuantityDiscount(factors, quantity);
  if (discount_fraction > 0) {
    unit_price = unit_price * (1 - discount_fraction);
  }

  // Rush multiplier (applied last per contract note)
  if (factors.rush_multiplier && factors.rush_multiplier > 1) {
    unit_price = unit_price * factors.rush_multiplier;
  }

  const total_price = unit_price * quantity;

  const breakdown: PricingBreakdownDetailedV1 = {
    material: round(material),
    machining: round(machining),
    setup: round(setup),
    finish: round(finish),
    inspection: round(inspection),
    overhead: round(overhead),
    margin: round(margin),
    unit_cost_before_margin: round(unit_cost_before_margin),
    unit_price: round(unit_price),
    total_price: round(total_price),
    cycle_time_min: round(cycle_time_min),
    machine_time_min: round(machine_time_min),
  };

  return breakdown;
}

export function computePricingForQuantities(
  base: Omit<ComputePricingInput, 'quantity'>,
  quantities: number[]
): Record<number, ComputePricingResult> {
  const results: Record<number, ComputePricingResult> = {};
  for (const q of quantities) {
    results[q] = computePricingBreakdown({ ...base, quantity: q });
  }
  return results;
}

function round(n: number | undefined): number {
  if (n === undefined || Number.isNaN(n)) return 0;
  return Math.round(n * 100) / 100; // 2 decimal places
}

export const __pricingComputeDoc = `Base Pricing Compute (Phase 1)
Algorithm Steps (per part):\n
1. Estimate machine_time_min via feature heuristics (placeholder).\n+2. Material cost = estimated_mass_kg * material_price_per_kg.\n+3. Setup cost amortized = setup_cost / quantity.\n+4. Machining cost = (machine_time_min / 60) * machine_rate_per_hour.\n+5. Finish, inspection added directly per factors.\n+6. Overhead = overhead_percent * (machining + material + setup).\n+7. unit_cost_before_margin = sum(material, machining, setup, finish, inspection, overhead).\n+8. margin = unit_cost_before_margin * base_margin_percent.\n+9. unit_price = (unit_cost_before_margin + margin) applying quantity discount then rush multiplier if provided.\n+10. total_price = unit_price * quantity.\n\n+Return shape conforms to PricingBreakdownDetailedV1 contract.\nFuture enhancements: real density lookup, process-specific cycle modeling, parallelization, risk adjustments.`;
