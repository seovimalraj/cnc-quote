import { Queue } from 'bullmq';
import { PricingComplianceMlAssistService } from './pricing-compliance-ml-assist.service';

describe('PricingComplianceMlAssistService', () => {
  let queueAdd: jest.Mock;
  let queue: Queue;
  let featureFlags: { evaluateFeatureFlag: jest.Mock };
  let supabase: any;
  let service: PricingComplianceMlAssistService;

  beforeEach(() => {
    queueAdd = jest.fn().mockResolvedValue(undefined);
    queue = { add: queueAdd } as unknown as Queue;
    featureFlags = {
      evaluateFeatureFlag: jest.fn().mockResolvedValue({ enabled: true }),
    } as any;

    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'quote-1', org_id: 'org-1' }, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockImplementation(() => ({ select, eq }));

    supabase = {
      client: {
        from,
      },
    };

    service = new PricingComplianceMlAssistService(queue, featureFlags as any, supabase);
  });

  it('does nothing when no event ids provided', async () => {
    await service.enqueueRationale({ quoteId: 'quote-1', quoteItemId: 'item-1', traceId: 'trace', eventIds: [] });
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('skips enqueue when feature flag disabled', async () => {
    featureFlags.evaluateFeatureFlag.mockResolvedValueOnce({ enabled: false });

    await service.enqueueRationale({
      quoteId: 'quote-1',
      quoteItemId: 'item-1',
      traceId: 'trace',
      eventIds: ['evt-1'],
    });

    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('enqueues job when feature flag enabled', async () => {
    await service.enqueueRationale({
      quoteId: 'quote-1',
      quoteItemId: 'item-1',
      traceId: 'trace',
      eventIds: ['evt-1', 'evt-2'],
    });

    expect(queueAdd).toHaveBeenCalledTimes(1);
    const [jobName, payload] = queueAdd.mock.calls[0];
    expect(jobName).toBe('generate-compliance-rationale');
    expect(payload).toMatchObject({
      quoteId: 'quote-1',
      quoteItemId: 'item-1',
      eventIds: ['evt-1', 'evt-2'],
      featureFlagKey: 'pricing_compliance_ml_assist',
    });
  });
});
