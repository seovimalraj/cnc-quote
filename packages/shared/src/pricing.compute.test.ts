import { describe, it, expect } from 'vitest';
import { computePricingBreakdown } from './pricing.compute';
import { CostFactorsV1 } from './contracts/v1/pricing';

const baseFactors: CostFactorsV1 = {
  machine_rate_per_hour: 60,
  setup_cost: 120, // $120 setup
  material_price_per_kg: 20,
  overhead_percent: 0.2,
  base_margin_percent: 0.25,
  inspection_cost_per_part: 2,
  finish_cost_adders: { FIN_A: 5 },
};

describe('computePricingBreakdown', () => {
  it('computes deterministic pricing for nominal input', () => {
    const result = computePricingBreakdown({
      quantity: 10,
      metrics: { volume_cc: 100, features: { holes: 4 } },
      factors: baseFactors,
    });
    expect(result.unit_price).toBeGreaterThan(0);
  // Allow small rounding drift at 2 decimal rounding; assert within 0.1
  expect(result.total_price).toBeCloseTo(result.unit_price! * 10, 1);
    expect(result.setup).toBeCloseTo(12, 2); // 120 / 10
    expect(result.finish).toBeCloseTo(5, 2);
  });

  it('applies quantity discount after margin and before rush', () => {
    const factors: CostFactorsV1 = {
      ...baseFactors,
      quantity_breaks: [
        { min_qty: 50, discount_percent: 5 },
        { min_qty: 100, discount_percent: 10 },
      ],
    };
    const q50 = computePricingBreakdown({ quantity: 50, metrics: { volume_cc: 80 }, factors });
    const q10 = computePricingBreakdown({ quantity: 10, metrics: { volume_cc: 80 }, factors });
    // Expect lower unit price at higher quantity
    expect(q50.unit_price!).toBeLessThan(q10.unit_price!);
  });

  it('applies rush multiplier last', () => {
    const factors: CostFactorsV1 = { ...baseFactors, rush_multiplier: 1.3 };
    const normal = computePricingBreakdown({ quantity: 5, metrics: { volume_cc: 50 }, factors: baseFactors });
    const rushed = computePricingBreakdown({ quantity: 5, metrics: { volume_cc: 50 }, factors });
    // Rushed should be higher
    expect(rushed.unit_price!).toBeCloseTo(normal.unit_price! * 1.3, 2);
  });

  it('throws on non-positive quantity', () => {
    expect(() => computePricingBreakdown({ quantity: 0, metrics: {}, factors: baseFactors })).toThrow();
  });

  it('respects machine_time override and reduces cost when shorter', () => {
    const baseline = computePricingBreakdown({ quantity: 2, metrics: { features: { holes: 20 } }, factors: baseFactors });
    const manual = computePricingBreakdown({ quantity: 2, metrics: { features: { holes: 20 } }, factors: baseFactors, overrides: { machine_time_min: 1 } });
    expect(manual.machining!).toBeLessThan(baseline.machining!);
    expect(manual.unit_price!).toBeLessThan(baseline.unit_price!);
  });
});
