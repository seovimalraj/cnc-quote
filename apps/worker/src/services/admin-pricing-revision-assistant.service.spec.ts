import axios from 'axios';
import { AdminPricingRevisionAssistantService } from './admin-pricing-revision-assistant.service.js';
import type {
  AdminPricingConfig,
  AdminPricingRevisionAssistantLLMResponseV1,
} from '@cnc-quote/shared';

describe('AdminPricingRevisionAssistantService (worker)', () => {
  const baseConfig: AdminPricingConfig = {
    version: 'v5',
    machines: {
      '3axis': {
        name: '3-Axis Mill',
        hourly_rate: 55,
        setup_rate: 35,
        min_setup_min: 20,
        feed_rate_map: {},
      },
    },
    materials: {
      aluminum6061: {
        grade: '6061-T6',
        stock_forms: [],
        finish_compat: [],
        buy_price: 6,
        waste_factor_percent: 12,
        machinability: 90,
      },
    },
    finishes: {
      anodized: {
        model: 'per_part',
        rate: 12,
        min_lot: 1,
        region_allowed: [],
      },
    },
    tolerance_packs: {
      standard: {
        cycle_time_multiplier: 1,
        surface_default: 1,
      },
    },
    inspection: {
      base_usd: 60,
      per_dim_usd: 6,
      program_min: 120,
    },
    speed_region: {
      us: {
        standard: {
          multiplier: 1,
          leadtime_days: 5,
        },
      },
    },
    risk_matrix: {
      default: {
        risk_percent: 5,
        risk_flat: 10,
        time_multiplier: 1,
      },
    },
    overhead_margin: {
      overhead_percent: 15,
      target_margin_percent: 22,
    },
  };

  const buildRunRecord = () => ({
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    status: 'queued' as const,
    instructions: 'Increase expedited multiplier for EU',
    focus_areas: ['eu'],
    base_version: baseConfig.version,
    base_config: baseConfig,
    trace_id: 'trace-1',
  });

  class SupabaseStub {
    public updates: Array<Record<string, any>> = [];
    constructor(private readonly runRecord: ReturnType<typeof buildRunRecord>) {}

    from(table: string) {
      if (table !== 'admin_pricing_revision_runs') {
        throw new Error(`Unexpected table ${table}`);
      }

      const maybeSingle = async () => ({ data: this.runRecord, error: null });
      const eqAfterSelect = () => ({ maybeSingle });

      return {
        select: () => ({ eq: eqAfterSelect }),
        update: (payload: Record<string, unknown>) => {
          this.updates.push(payload);
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    }
  }

  let axiosPost: jest.SpyInstance;

  beforeEach(() => {
    axiosPost = jest.spyOn(axios, 'post');
  });

  afterEach(() => {
    axiosPost.mockRestore();
  });

  it('applies adjustments and persists proposal details', async () => {
    const runRecord = buildRunRecord();
    const supabase = new SupabaseStub(runRecord) as any;

  const llmResponse: AdminPricingRevisionAssistantLLMResponseV1 = {
      adjustments: [
        {
          path: 'overhead_margin.overhead_percent',
          type: 'set',
          value: 18,
          reason: 'Rebalance overhead to protect margin',
        },
        {
          path: 'speed_region.us.standard.multiplier',
          type: 'multiply',
          value: 1.1,
          reason: 'Expedite surcharge increase',
        },
      ],
      notes: 'Keep target margin unchanged for standard orders.',
    };

    axiosPost.mockResolvedValue({
      data: {
        message: {
          content: JSON.stringify(llmResponse),
        },
        model: 'llama3.1:8b',
      },
    });

    const service = new AdminPricingRevisionAssistantService(supabase);
    await service.execute(runRecord.id);

    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(supabase.updates).toHaveLength(2);
    expect(supabase.updates[0]).toEqual(expect.objectContaining({ status: 'processing' }));

    const completionUpdate = supabase.updates[1];
    expect(completionUpdate).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        diff_summary: expect.arrayContaining([
          expect.stringContaining('overhead_margin.overhead_percent'),
          expect.stringContaining('speed_region.us.standard.multiplier'),
        ]),
        adjustments: expect.arrayContaining([
          expect.objectContaining({ beforeValue: 15, afterValue: 18 }),
        ]),
      }),
    );
  });

  it('marks run as failed when adjustments cannot be applied', async () => {
    const runRecord = buildRunRecord();
    const supabase = new SupabaseStub(runRecord) as any;

  const invalidResponse: AdminPricingRevisionAssistantLLMResponseV1 = {
      adjustments: [
        {
          path: 'unsupported.path',
          type: 'set',
          value: 0,
          reason: 'Invalid adjustment',
        },
      ],
    };

    axiosPost.mockResolvedValue({
      data: {
        message: {
          content: JSON.stringify(invalidResponse),
        },
        model: 'llama3.1:8b',
      },
    });

    const service = new AdminPricingRevisionAssistantService(supabase);
    await expect(service.execute(runRecord.id)).rejects.toThrow('Unsupported adjustment path');

    expect(supabase.updates).toHaveLength(2);
    const failureUpdate = supabase.updates[1];
    expect(failureUpdate).toEqual(expect.objectContaining({ status: 'failed' }));
    expect(failureUpdate.error_message).toContain('Unsupported adjustment path');
  });
});
