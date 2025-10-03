import { describe, it, expect } from 'vitest';
import { validateOrderStatusTransition, ORDER_STATUS_TRANSITIONS, ORDER_STATUSES, isFinalOrderState } from '../order-status';

describe('Order Status Transition Validator', () => {
  it('allows self transition (idempotent)', () => {
    expect(validateOrderStatusTransition('NEW', 'NEW').allowed).toBe(true);
  });

  it('allows every configured forward transition', () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUS_TRANSITIONS[from]) {
        const res = validateOrderStatusTransition(from, to as any);
        expect(res.allowed).toBe(true);
      }
    }
  });

  it('rejects invalid transitions with reason', () => {
    const res = validateOrderStatusTransition('NEW', 'QC');
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/Transition from NEW to QC/);
  });

  it('marks final states correctly', () => {
    expect(isFinalOrderState('COMPLETE')).toBe(true);
    expect(isFinalOrderState('CANCELLED')).toBe(true);
    expect(isFinalOrderState('PAID')).toBe(false);
  });
});
