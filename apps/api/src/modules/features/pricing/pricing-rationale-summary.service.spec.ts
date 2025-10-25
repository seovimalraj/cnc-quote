/* eslint-disable */
import { PricingRationaleSummaryService } from './pricing-rationale-summary.service';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { AdminFeatureFlagsService } from "../admin/admin/admin-feature-flags/admin-feature-flags.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { Queue } from 'bullmq';

// Jest globals for isolated TS build
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

describe('PricingRationaleSummaryService.scheduleSummary', () => {
  let supabaseFrom: jest.Mock;
  let featureFlags: { evaluateFeatureFlag: jest.Mock };
  let cache: { set: jest.Mock; del: jest.Mock };
  let queue: { add: jest.Mock };
  let service: PricingRationaleSummaryService;

  const items = [
    { id: 'item-1', pricing_matrix: [{ quantity: 1, total_price: 100, unit_price: 100 }], config_json: { selected_quantity: 1 } },
  ];

  function setupSupabase(overrides?: {
    quote?: any;
    summaryRow?: any;
    revision?: any;
  }) {
    supabaseFrom = jest.fn((table: string) => {
      switch (table) {
        case 'quotes':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: overrides?.quote ?? { id: 'quote-1', org_id: 'org-1', currency: 'USD' }, error: null }),
          };
        case 'quote_rationale_summaries':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: overrides?.summaryRow ?? null, error: null }),
          };
        case 'quote_revisions':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: overrides?.revision ?? { id: 'rev-1' }, error: null }),
          };
        default:
          throw new Error(`Unexpected table ${table}`);
      }
    });

    const supabase = { client: { from: supabaseFrom } } as unknown as SupabaseService;
    return supabase;
  }

  beforeEach(() => {
    featureFlags = { evaluateFeatureFlag: jest.fn() } as any;
    cache = { set: jest.fn(), del: jest.fn() } as any;
    queue = { add: jest.fn() } as any;
  });

  it('skips enqueue when feature flag disabled', async () => {
    const supabase = setupSupabase();
    featureFlags.evaluateFeatureFlag.mockResolvedValue({ enabled: false });

    service = new PricingRationaleSummaryService(supabase, featureFlags as unknown as AdminFeatureFlagsService, cache as unknown as CacheService, queue as unknown as Queue);

    await service.scheduleSummary({
      quoteId: 'quote-1',
      pricingVersion: 1,
      subtotal: 100,
      traceId: 'trace-1',
      items,
    });

    expect(queue.add).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('hydrates cache and avoids enqueue when existing summary matches hash', async () => {
    const supabase = setupSupabase({
      summaryRow: {
        quote_id: 'quote-1',
        quote_revision_id: 'rev-1',
        org_id: 'org-1',
        summary_text: 'Existing summary',
        breakdown_highlights: [],
        model_version: 'llama',
        trace_id: 'trace-existing',
        cost_sheet_hash: 'hash-123',
        cost_sheet: {
          quoteId: 'quote-1',
          pricingVersion: 1,
          currency: 'USD',
          subtotal: 100,
          total: 100,
          items: [],
        },
      },
    });
    featureFlags.evaluateFeatureFlag.mockResolvedValue({ enabled: true });

    service = new PricingRationaleSummaryService(supabase, featureFlags as unknown as AdminFeatureFlagsService, cache as unknown as CacheService, queue as unknown as Queue);

    await service.scheduleSummary({
      quoteId: 'quote-1',
      pricingVersion: 1,
      subtotal: 100,
      traceId: 'trace-1',
      items,
    });

    expect(queue.add).not.toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
  });

  it('enqueues job when feature flag enabled and no existing summary', async () => {
    const supabase = setupSupabase();
    featureFlags.evaluateFeatureFlag.mockResolvedValue({ enabled: true });

    service = new PricingRationaleSummaryService(supabase, featureFlags as unknown as AdminFeatureFlagsService, cache as unknown as CacheService, queue as unknown as Queue);

    await service.scheduleSummary({
      quoteId: 'quote-1',
      pricingVersion: 1,
      subtotal: 100,
      traceId: 'trace-1',
      items,
    });

    expect(cache.del).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ quoteId: 'quote-1', costSheetHash: expect.any(String) }),
      expect.any(Object),
    );
  });
});
