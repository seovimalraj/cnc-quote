import { describe, it, expect } from 'vitest';
import { computeFinishCostPerPart } from './finish-cost.util';
import { computePricingBreakdown } from './pricing.compute';
import { CostFactorsV1 } from './contracts/v1/pricing';

describe('finish-cost.util', () => {
  const mockMachine = { hourly_rate: 80 } as any;
  const baseFinish = { id: 'f1', code: 'FIN', name: 'Test Finish', type: 'surface', active: true } as any;

  it('returns 0 when no cost data present', () => {
    const c = computeFinishCostPerPart(baseFinish, mockMachine, { partSurfaceAreaCm2: 100 });
    expect(c).toBe(0);
  });

  it('adds per part and area costs', () => {
    const f = { ...baseFinish, cost_per_part: 2, cost_per_area_cm2: 0.01 };
    const c = computeFinishCostPerPart(f, mockMachine, { partSurfaceAreaCm2: 50 });
    // 2 + (0.01*50)=2.5 plus time component (none because no rate/prep) => 2.5
    expect(c).toBeCloseTo(2.5, 2);
  });

  it('includes time-based cost when rate and prep provided', () => {
    const f = { ...baseFinish, prep_time_min: 6, rate_cm2_min: 20, cost_per_part: 1, cost_per_area_cm2: 0 };
    const c = computeFinishCostPerPart(f, mockMachine, { partSurfaceAreaCm2: 200 });
    // effective area = 100 cm2 => processTime = 100/20=5 min, total time=11 min
    // labor rate = 0.6 * 80 = 48 => (11/60)*48 = 8.8 approx, + cost_per_part 1 => ~9.8
    expect(c).toBeGreaterThan(9.5);
    expect(c).toBeLessThan(10.2);
  });
});

describe('risk-based margin (integration style)', () => {
  const metrics = { volume_cc: 100, features: { holes: 2 } } as any;
  const baseFactors: CostFactorsV1 = {
    machine_rate_per_hour: 60,
    setup_cost: 60,
    material_price_per_kg: 20,
    base_margin_percent: 0.25,
    overhead_percent: 0.1,
  };

  it('higher margin increases unit price (simulating risk uplift)', () => {
    const normal = computePricingBreakdown({ quantity: 5, metrics, factors: baseFactors });
    const uplift = computePricingBreakdown({ quantity: 5, metrics, factors: { ...baseFactors, base_margin_percent: 0.33 } });
    expect(uplift.unit_price).toBeGreaterThan(normal.unit_price);
  });
});
