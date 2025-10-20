/* eslint-disable */
import axios from 'axios';
import { ContractsV1 } from '@cnc-quote/shared';
import { PricingRationaleService } from './pricing-rationale.service.js';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const jest: any;

describe('PricingRationaleService', () => {
  const basePayload: ContractsV1.PricingRationaleSummaryJobV1 = {
    version: 1,
    quoteId: 'quote-1',
    quoteRevisionId: 'rev-1',
    orgId: 'org-1',
    traceId: 'trace-1',
    pricingVersion: 123,
    featureFlagKey: 'pricing_quote_rationale',
    costSheetHash: 'hash-123',
    costSheet: {
      quoteId: 'quote-1',
      pricingVersion: 123,
      currency: 'USD',
      subtotal: 100,
      total: 100,
      items: [
        {
          quoteItemId: 'item-1',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          leadTimeDays: 5,
          breakdown: { material_cost: 40, machine_cost: 60 } as any,
          compliance: null,
        },
      ],
    },
  };

  let supabase: any;
  let redis: { set: jest.Mock };
  let axiosPost: jest.SpyInstance;

  beforeEach(() => {
    supabase = {
      from: jest.fn(() => ({
        upsert: jest.fn().mockReturnValue({ error: null }),
      })),
    };
    redis = { set: jest.fn() } as any;
    axiosPost = jest.spyOn(axios, 'post');
  });

  afterEach(() => {
    axiosPost.mockRestore();
  });

  it('throws when model response is not valid JSON', async () => {
    axiosPost.mockResolvedValue({ data: { message: { content: 'not-json' }, model: 'llama3.1:8b' } });

    const service = new PricingRationaleService(supabase, redis as any);

    await expect(service.generateAndPersist(basePayload)).rejects.toThrow('Failed to parse model response JSON');
    expect(supabase.from).not.toHaveBeenCalledWith('quote_rationale_summaries');
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('persists summary and writes cache when model response valid', async () => {
    const responseBody = {
      summaryText: 'This quote is healthy. Machining drives most cost.',
      breakdownHighlights: [
        {
          category: 'machining',
          description: 'Machining operations drive 60% of subtotal.',
          amountImpact: 60,
          percentImpact: 60,
        },
      ],
    };

    axiosPost.mockResolvedValue({
      data: {
        message: {
          content: JSON.stringify(responseBody),
        },
        model: 'llama3.1:8b',
      },
    });

    const service = new PricingRationaleService(supabase, redis as any);
    const result = await service.generateAndPersist(basePayload);

    expect(result.summary.summaryText).toContain('healthy');
    expect(supabase.from).toHaveBeenCalledWith('quote_rationale_summaries');
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('pricing:rationale:v1:quote:'),
      expect.any(String),
      'EX',
      expect.any(Number),
    );
  });
});
