// @ts-nocheck

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}));

import { QuotesService } from './quotes.service';
import type { SupabaseService } from '../../lib/supabase/supabase.service';
import type { QuoteRevisionsService } from './quote-revisions.service';
import type { MetricsService } from '../metrics/metrics.service';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { NotifyService } from '../notify/notify.service';

const baseQuoteRow = {
  id: 'quote-1',
  org_id: 'org-1',
  customer_id: 'cust-1',
  total_amount: 123.45,
  currency: 'USD',
};

type SupabaseSelectResponse = { data: { id: string; status: string }; error: null };

describe('QuotesService.status transitions', () => {
  const createService = (currentStatus: string) => {
    const single = jest.fn<Promise<SupabaseSelectResponse>, []>().mockResolvedValue({
      data: { id: 'quote-1', status: currentStatus },
      error: null,
    });

    const fromMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single,
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const supabase = { client: { from: fromMock } } as unknown as SupabaseService;
    const revisions = {
      createDraftRevision: jest.fn(),
      fetchRevisions: jest.fn(),
      createRevisionFromQuoteState: jest.fn(),
    } as unknown as QuoteRevisionsService;
    const metrics = {
      quoteStatusTransitions: {
        inc: jest.fn(),
      },
    } as unknown as MetricsService;
    const analytics = {
      trackQuoteStatusChange: jest.fn(),
      trackQuoteEvent: jest.fn(),
    } as unknown as AnalyticsService;
    const notify = {
      notifyQuoteStatusChange: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotifyService;

    const service = new QuotesService(supabase, revisions, metrics, analytics, notify);
    return { service, single, metrics, analytics, notify };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records processing timestamp when moving draft -> processing', async () => {
    const { service } = createService('draft');
    const updateSpy = jest
      .spyOn(service, 'updateQuote')
      .mockResolvedValue({ ...baseQuoteRow, status: 'processing' } as any);

    await service.transitionQuoteStatus('quote-1', 'processing');

    expect(updateSpy).toHaveBeenCalledWith(
      'quote-1',
      expect.objectContaining({
        status: 'processing',
        processing_started_at: expect.any(String),
      }),
      undefined,
    );
  });

  it('records ready timestamp when moving processing -> ready', async () => {
    const { service } = createService('processing');
    const updateSpy = jest
      .spyOn(service, 'updateQuote')
      .mockResolvedValue({ ...baseQuoteRow, status: 'ready' } as any);

    await service.transitionQuoteStatus('quote-1', 'ready');

    expect(updateSpy).toHaveBeenCalledWith(
      'quote-1',
      expect.objectContaining({
        status: 'ready',
        ready_at: expect.any(String),
      }),
      undefined,
    );
  });

  it('allows sent -> cancelled and emits cancellation timestamp and notification', async () => {
    const { service, notify } = createService('sent');
    const updateSpy = jest
      .spyOn(service, 'updateQuote')
      .mockResolvedValue({ ...baseQuoteRow, status: 'cancelled' } as any);

    await service.transitionQuoteStatus('quote-1', 'cancelled');

    expect(updateSpy).toHaveBeenCalledWith(
      'quote-1',
      expect.objectContaining({
        status: 'cancelled',
        cancelled_at: expect.any(String),
      }),
      undefined,
    );
    expect(notify.notifyQuoteStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: 'quote-1',
        previousStatus: 'sent',
        status: 'cancelled',
      }),
    );
  });

  it('allows accepted -> converted and stamps converted_at', async () => {
    const { service } = createService('accepted');
    const updateSpy = jest
      .spyOn(service, 'updateQuote')
      .mockResolvedValue({ ...baseQuoteRow, status: 'converted' } as any);

    await service.transitionQuoteStatus('quote-1', 'converted');

    expect(updateSpy).toHaveBeenCalledWith(
      'quote-1',
      expect.objectContaining({
        status: 'converted',
        converted_at: expect.any(String),
      }),
      undefined,
    );
  });

  it('rejects invalid transitions', async () => {
    const { service } = createService('draft');
    const updateSpy = jest.spyOn(service, 'updateQuote');

    await expect(service.transitionQuoteStatus('quote-1', 'accepted')).rejects.toThrow(
      'Invalid status transition from draft to accepted',
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
