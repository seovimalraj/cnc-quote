import { PricingComplianceService } from './pricing-compliance.service';
import { ConfigService } from '@nestjs/config';
import { ContractsV1 } from '@cnc-quote/shared';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('PricingComplianceService', () => {
  const mockConfig = {
    get: (key: string) => {
      if (key === 'PRICING_DISCOUNT_ALERT_THRESHOLD') {
        return 0.2;
      }
      return undefined;
    },
  } as unknown as ConfigService;

  const service = new PricingComplianceService(mockConfig);

  const baseSnapshot = (overrides: Partial<ContractsV1.QuoteComplianceSnapshotV1> = {}): ContractsV1.QuoteComplianceSnapshotV1 => ({
    quantity: 1,
    currency: 'USD',
    unit_price: 100,
    price_before_discounts: 100,
    total_price: 100,
    margin_percent: 0.18,
    margin_floor_percent: 0.24,
    lead_time_option: 'standard',
    expedited: false,
    alerts: [],
    ...overrides,
  } as ContractsV1.QuoteComplianceSnapshotV1);

  const wrapMatrix = (snapshot: ContractsV1.QuoteComplianceSnapshotV1): ContractsV1.PricingBreakdownV1[] => ([{
    quantity: snapshot.quantity,
    unit_price: snapshot.unit_price,
    total_price: snapshot.total_price,
    lead_time_days: snapshot.lead_time_standard_days ?? 0,
    breakdown: {
      material: 10,
      machining: 10,
      setup: 5,
      finish: 0,
      inspection: 0,
      overhead: 5,
      margin: 10,
    },
    cost_factors: {
      material: 10,
      machining: 10,
      setup: 5,
      finish: 0,
      inspection: 0,
      overhead: 5,
      margin: 10,
    },
    status: 'ready',
    compliance: snapshot,
  } as unknown as ContractsV1.PricingBreakdownV1]);

  it('flags margin floor breaches as critical', () => {
    const events = service.evaluate({
      quoteId: 'q1',
      quoteItemId: 'item1',
      matrix: wrapMatrix(baseSnapshot()),
      traceId: 'trace-1',
    });

    expect(events.some((event) => event.code === 'quote_margin_floor_breach' && event.severity === 'critical')).toBe(true);
  });

  it('detects manual discount high when threshold exceeded', () => {
    const snapshot = baseSnapshot({ margin_percent: 0.3, discount_percent: 0.25 });
    const events = service.evaluate({
      quoteId: 'q1',
      quoteItemId: 'item1',
      matrix: wrapMatrix(snapshot),
      traceId: 'trace-1',
    });

    expect(events.some((event) => event.code === 'quote_manual_discount_high')).toBe(true);
  });

  it('detects lead time overrides', () => {
    const snapshot = baseSnapshot({ margin_percent: 0.3, margin_floor_percent: 0.2, lead_time_override_days: 2 });
    const events = service.evaluate({
      quoteId: 'q1',
      quoteItemId: 'item1',
      matrix: wrapMatrix(snapshot),
      traceId: 'trace-1',
    });

    expect(events.some((event) => event.code === 'lead_time_override_detected')).toBe(true);
  });

  it('flags high DFM severity without uplift', () => {
    const snapshot = baseSnapshot({
      margin_percent: 0.3,
      margin_floor_percent: 0.2,
      dfm_risk_severity: 'HIGH',
      risk_uplift_percent: 0,
    });
    const events = service.evaluate({
      quoteId: 'q1',
      quoteItemId: 'item1',
      matrix: wrapMatrix(snapshot),
      traceId: 'trace-1',
    });

    expect(events.some((event) => event.code === 'dfm_high_risk_ignored')).toBe(true);
  });
});
