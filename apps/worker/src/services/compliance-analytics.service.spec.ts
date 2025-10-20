import { SupabaseClient } from '@supabase/supabase-js';
import { ComplianceAnalyticsService } from './compliance-analytics.service.js';
import { MetricsPublisher } from '../lib/pushgateway.js';

describe('ComplianceAnalyticsService', () => {
  const windowStart = new Date('2025-10-18T00:00:00.000Z');
  const windowEnd = new Date('2025-10-19T00:00:00.000Z');
  const eventBase = {
    severity: 'warning',
    org_id: 'org-1',
    quote_item_id: 'item-1',
    message: 'Test event',
    created_at: windowStart.toISOString(),
    payload: { snapshot: {} },
  } as const;

  function buildSupabaseDouble(events: any[]) {
    const selectBuilder = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest
        .fn()
        .mockResolvedValueOnce({ data: events, error: null })
        .mockResolvedValueOnce({ data: [], error: null }),
    };

    const deleteEq = jest.fn().mockResolvedValue({ error: null });
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const rollupBuilder = {
      delete: jest.fn(() => ({ eq: deleteEq })),
      insert: insertMock,
    };

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'quote_compliance_events') {
          return selectBuilder;
        }
        if (table === 'quote_compliance_daily_rollups') {
          return rollupBuilder;
        }
        throw new Error(`Unexpected table requested: ${table}`);
      }),
    } as unknown as SupabaseClient;

  return { supabase, deleteEq, rollupBuilder, selectBuilder, insertMock };
  }

  it('aggregates rollups and pushes metrics for daily compliance events', async () => {
    const events = [
      {
        id: 'evt-1',
        code: 'quote_manual_discount_high',
        severity: 'warning',
        org_id: 'org-1',
        quote_id: 'quote-1',
        quote_item_id: 'item-1',
        message: 'Discount high',
        created_at: windowStart.toISOString(),
        payload: { snapshot: { discount_percent: 0.32 } },
      },
      {
        id: 'evt-2',
        code: 'quote_manual_discount_high',
        severity: 'warning',
        org_id: 'org-1',
        quote_id: 'quote-1',
        quote_item_id: 'item-2',
        message: 'Discount higher',
        created_at: windowStart.toISOString(),
        payload: { snapshot: { discount_percent: 0.41 } },
      },
      {
        id: 'evt-3',
        code: 'lead_time_override_detected',
        severity: 'critical',
        org_id: 'org-1',
        quote_id: 'quote-2',
        quote_item_id: 'item-3',
        message: 'Lead override',
        created_at: windowStart.toISOString(),
        payload: { snapshot: { lead_time_override_days: 5 } },
      },
    ];

  const { supabase, rollupBuilder, insertMock } = buildSupabaseDouble(events);

    const metricsPublisher: MetricsPublisher = {
      publishCompliance: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ComplianceAnalyticsService(supabase, metricsPublisher);
    const result = await service.run({ bucketDate: windowEnd });

    expect(result.eventCount).toBe(3);
    expect(result.quoteCount).toBe(2);

    expect(rollupBuilder.delete).toHaveBeenCalledTimes(1);
  expect(insertMock).toHaveBeenCalledTimes(1);

  const insertedPayload = insertMock.mock.calls[0][0];
    expect(insertedPayload).toHaveLength(4);

    const quoteRow = insertedPayload.find((row: any) => row.quote_id === 'quote-1');
    expect(quoteRow.event_count).toBe(2);
    expect(quoteRow.metadata.max_discount_percent).toBeCloseTo(0.41);

    const summaryRow = insertedPayload.find(
      (row: any) => row.quote_id === null && row.code === 'quote_manual_discount_high',
    );
    expect(summaryRow.quote_count).toBe(1);
    expect(summaryRow.metadata.top_offenders[0]).toMatchObject({
      quote_id: 'quote-1',
      metric: 0.41,
      event_count: 2,
    });

    expect(metricsPublisher.publishCompliance).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'lead_time_override_detected',
          severity: 'critical',
          eventCount: 1,
          quoteCount: 1,
        }),
      ]),
    );
  });
});
