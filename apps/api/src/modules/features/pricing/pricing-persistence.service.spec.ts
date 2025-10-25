/* eslint-disable */
import { PricingPersistenceService } from './pricing-persistence.service';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { PricingComplianceService, PricingComplianceEvent } from './pricing-compliance.service';
import { Queue } from 'bullmq';

// Basic Jest globals for isolated TS build
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

describe('PricingPersistenceService', () => {
  let supabaseFrom: jest.Mock;
  let complianceService: { evaluate: jest.Mock };
  let manualReviewQueue: { add: jest.Mock };
  let notifyService: { notifyCriticalComplianceAlert: jest.Mock };
  let complianceMlAssist: { enqueueRationale: jest.Mock };
  let rationaleSummary: { scheduleSummary: jest.Mock };
  let service: PricingPersistenceService;

  const baseParams = {
    quote_id: 'quote-1',
    quote_item_id: 'item-1',
    matrix: [
      {
        quantity: 1,
        total_price: 150,
      },
    ],
    partConfig: { id: 'part-1' } as any,
    traceId: 'trace-123',
  } as const;

  beforeEach(() => {
    supabaseFrom = jest.fn();
    const supabase = { client: { from: supabaseFrom } } as unknown as SupabaseService;
    complianceService = {
      evaluate: jest.fn(),
    } as any;
    manualReviewQueue = {
      add: jest.fn(),
    } as any as Queue;
    notifyService = {
      notifyCriticalComplianceAlert: jest.fn(),
    } as any;

    complianceMlAssist = {
      enqueueRationale: jest.fn().mockResolvedValue(undefined),
    } as any;

    rationaleSummary = {
      scheduleSummary: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new PricingPersistenceService(
      supabase,
      complianceService as unknown as PricingComplianceService,
      complianceMlAssist as any,
      rationaleSummary as any,
      manualReviewQueue as unknown as Queue,
      notifyService as any,
    );
  });

  function primeSuccessfulSupabaseMocks({ includeQuoteSnapshot = true, eventIds }: { includeQuoteSnapshot?: boolean; eventIds?: string[] } = {}) {
    // 1) Update quote_items
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('quote_items');
      return {
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    });

    // 2) Select quote_items for subtotal
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('quote_items');
      return {
        select: () => ({
          eq: () => Promise.resolve({
            data: [
              {
                id: baseParams.quote_item_id,
                pricing_matrix: baseParams.matrix,
                config_json: { selected_quantity: 1 },
              },
            ],
            error: null,
          }),
        }),
      };
    });

    // 3) Update quotes with totals
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('quotes');
      return {
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    });

    // 4) Insert compliance events -> return inserted rows
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('quote_compliance_events');
      return {
        insert: (rows: any[]) => ({
          select: () => Promise.resolve({
            data: rows.map((row: any, idx: number) => ({
              id: eventIds?.[idx] || `event-${idx + 1}`,
              code: row.code,
              severity: row.severity,
              trace_id: row.trace_id,
            })),
            error: null,
          }),
        }),
      };
    });

    if (includeQuoteSnapshot) {
      // 5) Fetch snapshot for queue payload
      supabaseFrom.mockImplementationOnce((table: string) => {
        expect(table).toBe('quotes');
        const maybeSingle = jest.fn().mockResolvedValue({
          data: {
            id: baseParams.quote_id,
            org_id: 'org-1',
            status: 'draft',
            created_by: 'user-1',
            user_id: 'user-1',
          },
          error: null,
        });
        const eq = jest.fn().mockReturnValue({ maybeSingle });
        const select = jest.fn().mockReturnValue({ eq });
        return { select };
      });
    }
  }

  it('swallows manual review queue failures after persisting critical compliance events', async () => {
    primeSuccessfulSupabaseMocks();

    const criticalEvent: PricingComplianceEvent = {
      quoteId: baseParams.quote_id,
      quoteItemId: baseParams.quote_item_id,
      partId: 'part-1',
      quantity: 1,
      code: 'quote_margin_floor_breach',
      severity: 'critical',
      message: 'Margin guardrail breached',
      traceId: baseParams.traceId,
      payload: { trace_id: baseParams.traceId, snapshot: {} as any },
    };

    complianceService.evaluate.mockReturnValue([criticalEvent]);
    manualReviewQueue.add.mockRejectedValue(new Error('redis-down'));

    const result = await service.persistMatrixAndTotals({ ...baseParams });

    expect(result.subtotal).toBe(150);
    expect(manualReviewQueue.add).toHaveBeenCalledTimes(1);
    expect(manualReviewQueue.add.mock.calls[0][0]).toBe('pricing-compliance-escalation');
    // Ensure the rejection was handled and method still resolved
    expect(result.total).toBe(150);
    expect(notifyService.notifyCriticalComplianceAlert).not.toHaveBeenCalled();
  expect(complianceMlAssist.enqueueRationale).not.toHaveBeenCalled();
  });

  it('does not enqueue manual review when only warning events are emitted', async () => {
    primeSuccessfulSupabaseMocks();

    const warningEvent: PricingComplianceEvent = {
      quoteId: baseParams.quote_id,
      quoteItemId: baseParams.quote_item_id,
      quantity: 1,
      code: 'quote_manual_discount_high',
      severity: 'warning',
      message: 'High discount warning',
      traceId: baseParams.traceId,
      payload: { trace_id: baseParams.traceId, snapshot: {} as any },
    };

    complianceService.evaluate.mockReturnValue([warningEvent]);
    manualReviewQueue.add.mockResolvedValue(undefined);

    const result = await service.persistMatrixAndTotals({ ...baseParams });

    expect(result.subtotal).toBe(150);
    expect(manualReviewQueue.add).not.toHaveBeenCalled();
    expect(notifyService.notifyCriticalComplianceAlert).not.toHaveBeenCalled();
  });

  it('dispatches notifications for new critical compliance alerts keyed by quote and code', async () => {
    primeSuccessfulSupabaseMocks({ eventIds: ['event-critical-1'] });

    const criticalEvent: PricingComplianceEvent = {
      quoteId: baseParams.quote_id,
      quoteItemId: baseParams.quote_item_id,
      partId: 'part-1',
      quantity: 5,
      code: 'lead_time_override_detected',
      severity: 'critical',
      message: 'Lead time override requires approval',
      traceId: baseParams.traceId,
      payload: { trace_id: baseParams.traceId, snapshot: {} as any },
    };

    complianceService.evaluate.mockReturnValue([criticalEvent]);
    manualReviewQueue.add.mockResolvedValue(undefined);

    await service.persistMatrixAndTotals({ ...baseParams });

    expect(manualReviewQueue.add).toHaveBeenCalledTimes(1);
    expect(notifyService.notifyCriticalComplianceAlert).toHaveBeenCalledTimes(1);
    expect(notifyService.notifyCriticalComplianceAlert.mock.calls[0][0]).toMatchObject({
      quoteId: baseParams.quote_id,
      quoteItemId: baseParams.quote_item_id,
      eventIds: ['event-critical-1'],
      dedupeKey: 'quote:quote-1:codes:lead_time_override_detected',
    });

    expect(complianceMlAssist.enqueueRationale).toHaveBeenCalledWith({
      quoteId: baseParams.quote_id,
      quoteItemId: baseParams.quote_item_id,
      traceId: baseParams.traceId,
      eventIds: ['event-critical-1'],
    });

    primeSuccessfulSupabaseMocks({ eventIds: ['event-critical-2'] });
    await service.persistMatrixAndTotals({ ...baseParams });

    expect(notifyService.notifyCriticalComplianceAlert).toHaveBeenCalledTimes(1);
    expect(complianceMlAssist.enqueueRationale).toHaveBeenCalledTimes(1);
  });
});
