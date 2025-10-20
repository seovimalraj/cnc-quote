// @ts-nocheck
/// <reference types="jest" />
import { diffPricingMatrix, computeSelectedSubtotalDelta } from './pricing-diff.util';

describe('pricing-diff.util', () => {
  const prev = [
    { quantity: 1, unit_price: 100, total_price: 100, lead_time_days: 10, breakdown: { material: 40 } },
    { quantity: 10, unit_price: 70, total_price: 700, lead_time_days: 12, breakdown: { material: 300 } },
  ];

  it('emits patch for new quantity row only', () => {
    const next = [...prev, { quantity: 25, unit_price: 55, total_price: 1375, lead_time_days: 15, breakdown: { material: 900 } }];
    const patches = diffPricingMatrix(prev as any, next as any);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ quantity: 25, unit_price: 55 });
  });

  it('emits patch when unit_price changes', () => {
    const next = [
      { ...prev[0], unit_price: 95, total_price: 95 },
      prev[1],
    ];
    const patches = diffPricingMatrix(prev as any, next as any);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ quantity: 1, unit_price: 95, total_price: 95 });
  });

  it('suppresses patch when nothing changes', () => {
    const patches = diffPricingMatrix(prev as any, [...prev] as any);
    expect(patches).toHaveLength(0);
  });

  it('emits patch when compliance snapshot changes without price change', () => {
    const withCompliancePrev = [{
      ...prev[0],
      compliance: { quantity: 1, alerts: [], currency: 'USD', unit_price: 100, price_before_discounts: 100, total_price: 100, margin_percent: 0.25, lead_time_option: 'standard', expedited: false } as any,
    }, prev[1]];
    const withComplianceNext = [{
      ...withCompliancePrev[0],
      compliance: {
        ...(withCompliancePrev[0] as any).compliance,
        alerts: [{ code: 'margin_floor_breach', severity: 'critical', message: 'Margin below floor' }],
      },
    }, prev[1]];
    const patches = diffPricingMatrix(withCompliancePrev as any, withComplianceNext as any);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ quantity: 1 });
    expect((patches[0] as any).compliance.alerts?.[0]?.code).toBe('margin_floor_breach');
  });

  it('subtotal delta reflects change only in updated item selected quantity', () => {
    const prevItems = [
      { id: 'A', matrix: prev, selected_quantity: 1 },
      { id: 'B', matrix: [ { quantity: 1, unit_price: 50, total_price: 50, lead_time_days: 8 } ], selected_quantity: 1 }
    ];
    const newMatrix = [ { quantity: 1, unit_price: 90, total_price: 90, lead_time_days: 10 } ];
    const delta = computeSelectedSubtotalDelta({
      prevItems: prevItems as any,
      updatedItemId: 'A',
      newMatrix: newMatrix as any,
      newSelectedQuantity: 1,
    });
    // Original subtotal: 100 + 50 = 150; new subtotal: 90 + 50 = 140 => delta -10
    expect(delta).toBe(-10);
  });

  it('subtotal delta handles selected quantity switch', () => {
    const complexPrev = [
      { quantity: 1, unit_price: 100, total_price: 100, lead_time_days: 10 },
      { quantity: 5, unit_price: 80, total_price: 400, lead_time_days: 11 },
    ];
    const newMatrix = [
      { quantity: 1, unit_price: 100, total_price: 100, lead_time_days: 10 },
      { quantity: 5, unit_price: 75, total_price: 375, lead_time_days: 11 },
    ];
    const prevItems = [ { id: 'A', matrix: complexPrev, selected_quantity: 1 } ];
    const delta = computeSelectedSubtotalDelta({
      prevItems: prevItems as any,
      updatedItemId: 'A',
      newMatrix: newMatrix as any,
      newSelectedQuantity: 5,
    });
    // Old subtotal uses qty1 = 100; new uses qty5 = 375 => delta +275
    expect(delta).toBe(275);
  });
});
