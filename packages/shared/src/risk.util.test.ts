import { describe, it, expect } from 'vitest';
import { applyRiskMargin } from './risk.util';

describe('applyRiskMargin', () => {
  it('returns base when no risk provided', () => {
    expect(applyRiskMargin(0.25)).toBe(0.25);
  });
  it('applies proportional uplift', () => {
    expect(applyRiskMargin(0.2, 0.5)).toBeCloseTo(0.24, 3); // 0.2 + 0.08*0.5 = 0.24
  });
  it('caps at max uplift', () => {
    expect(applyRiskMargin(0.2, 2)).toBeCloseTo(0.28, 3); // capped risk=1
  });
});
