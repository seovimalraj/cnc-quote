import { AdminRiskComplianceService } from './admin-risk-compliance.service';

describe('AdminRiskComplianceService', () => {
  const service = new AdminRiskComplianceService();

  it('flags significant pricing delta', () => {
    const alerts = service.evaluate(
      {
        area: 'pricing',
        action: 'publish_pricing_config',
        target_type: 'pricing_config',
      },
      {
        before: { margin: { default: 0.15 } },
        after: { margin: { default: 0.35 } },
      },
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'pricing_delta',
        }),
      ]),
    );
  });

  it('flags lead time override with large decrease', () => {
    const alerts = service.evaluate(
      {
        area: 'quotes',
        action: 'override_lead_time',
        notes: 'manual lead override',
        target_type: 'quote_line',
      },
      {
        before: { scheduling: { lead_time_days: 12 } },
        after: { scheduling: { lead_time_days: 4 } },
      },
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'lead_time_override',
          severity: 'critical',
        }),
      ]),
    );
  });

  it('returns empty alerts when diff is null', () => {
    const alerts = service.evaluate(
      {
        area: 'pricing',
        action: 'noop',
      },
      null,
    );

    expect(alerts).toEqual([]);
  });
});